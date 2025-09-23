import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KL_API_BASE = "https://a.klaviyo.com/api";

serve(async (req) => {
  // CORS/preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: cors() });
  }

  try {
    if (req.method !== "POST") {
      return jerr(405, "Method not allowed", { allow: "POST" });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return jerr(400, "Content-Type must be application/json");
    }

    const { storeId, from, to } = await req.json().catch(() => ({}));
    if (!storeId || !from || !to) {
      return jerr(400, "Missing required body: {storeId, from, to}");
    }

    const fromDate = new Date(from), toDate = new Date(to);
    if (isNaN(+fromDate) || isNaN(+toDate) || fromDate >= toDate) {
      return jerr(400, "Invalid date range", { from, to });
    }

    // Supabase com SERVICE ROLE
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, 
      { auth: { persistSession: false } }
    );

    // Buscar chave privada da Klaviyo
    const { data: integ, error: iErr } = await supabase
      .from("integrations")
      .select("key_secret_encrypted")
      .eq("store_id", storeId)
      .eq("provider", "klaviyo")
      .maybeSingle();

    if (iErr || !integ) {
      return jerr(404, "Klaviyo integration not found", { storeId });
    }

    const apiKey = await decrypt(integ.key_secret_encrypted ?? "");
    if (!apiKey) {
      return jerr(400, "Missing Klaviyo private key");
    }

    // Headers para Klaviyo
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Klaviyo-API-Key ${apiKey}`
    };

    console.log(`Fetching Klaviyo data for store ${storeId} from ${from} to ${to}`);

    // Buscar dados da Klaviyo
    const campaigns = await listCampaigns(headers, fromDate, toDate);
    const campaignsMetrics = await fetchCampaignsMetrics(headers, campaigns, fromDate, toDate);
    const flowsMetrics = await fetchFlowsMetrics(headers, fromDate, toDate);
    const leadsTotal = await countProfiles(headers);

    // Consolidar
    const revenue_campaigns = sumField(campaignsMetrics, "revenue");
    const conv_campaigns = sumField(campaignsMetrics, "conversions");

    const revenue_flows = flowsMetrics.revenue;
    const conv_flows = flowsMetrics.conversions;

    const revenue_total = revenue_campaigns + revenue_flows;
    const orders_attributed = conv_campaigns + conv_flows;

    const top_by_rev = topN(campaignsMetrics, "revenue", 5).map(x => pickCampaign(x));
    const top_by_conv = topN(campaignsMetrics, "conversions", 5).map(x => pickCampaign(x));

    // Persistir como cache/fallback
    await supabase.from("klaviyo_summaries").upsert({
      store_id: storeId,
      period_start: toDateToYMD(fromDate),
      period_end: toDateToYMD(toDate),
      revenue_total,
      revenue_campaigns,
      revenue_flows,
      orders_attributed,
      leads_total: leadsTotal,
      top_campaigns_by_revenue: top_by_rev,
      top_campaigns_by_conversions: top_by_conv
    }, { onConflict: "store_id,period_start,period_end" });

    console.log(`Klaviyo summary completed: ${revenue_total} revenue, ${leadsTotal} leads`);

    return json({
      klaviyo: {
        revenue_total,
        revenue_campaigns,
        revenue_flows,
        orders_attributed,
        top_campaigns_by_revenue: top_by_rev,
        top_campaigns_by_conversions: top_by_conv,
        leads_total: leadsTotal
      },
      period: { start: toDateToYMD(fromDate), end: toDateToYMD(toDate) },
      store: { id: storeId }
    });

  } catch (e) {
    console.error("Klaviyo summary error:", e);
    return jerr(500, "Unexpected error", { error: String(e) });
  }
});

/** ===== Helpers Klaviyo ===== */

async function listCampaigns(headers: Record<string,string>, from: Date, to: Date) {
  const url = `${KL_API_BASE}/campaigns?fields[campaign]=name,created,send_time&per_page=100`;
  const items: any[] = [];
  let next = url;
  
  for (let i = 0; i < 10 && next; i++) {
    try {
      const r = await fetch(next, { headers });
      if (!r.ok) break;
      
      const d = await r.json().catch(() => ({}));
      const data = d?.data || [];
      
      for (const c of data) {
        const send = c?.attributes?.send_time ? new Date(c.attributes.send_time) : null;
        if (send && send >= from && send < to) {
          items.push({
            id: c.id,
            name: c?.attributes?.name || c?.attributes?.campaign_name || "Campaign",
            send_time: c?.attributes?.send_time || null
          });
        }
      }
      
      next = d?.links?.next || null;
    } catch (e) {
      console.error("Error listing campaigns:", e);
      break;
    }
  }
  
  return items;
}

async function fetchCampaignsMetrics(headers: Record<string,string>, campaigns: any[], from: Date, to: Date) {
  const out: any[] = [];
  
  for (const c of campaigns) {
    try {
      const qs = new URLSearchParams({
        start_date: toDateToYMD(from),
        end_date: toDateToYMD(to)
      });
      
      const r = await fetch(`${KL_API_BASE}/campaigns/${c.id}/values-reports?${qs}`, { headers });
      if (!r.ok) continue;
      
      const d = await r.json().catch(() => ({}));
      const revenue = Number(d?.data?.attributes?.revenue ?? d?.data?.revenue ?? 0);
      const conversions = Number(d?.data?.attributes?.conversions ?? d?.data?.conversions ?? 0);
      
      out.push({
        id: c.id,
        name: c.name,
        send_time: c.send_time,
        revenue,
        conversions,
        status: "sent"
      });
    } catch (e) {
      console.error(`Error fetching metrics for campaign ${c.id}:`, e);
    }
  }
  
  return out;
}

async function fetchFlowsMetrics(headers: Record<string,string>, from: Date, to: Date) {
  let revenue = 0, conversions = 0;

  try {
    const qs = new URLSearchParams({
      start_date: toDateToYMD(from),
      end_date: toDateToYMD(to)
    });
    
    const r = await fetch(`${KL_API_BASE}/flows/values-reports?${qs}`, { headers });
    if (r.ok) {
      const d = await r.json().catch(() => ({}));
      const arr = Array.isArray(d?.data) ? d.data : [];
      
      for (const x of arr) {
        revenue += Number(x?.attributes?.revenue ?? x?.revenue ?? 0);
        conversions += Number(x?.attributes?.conversions ?? x?.conversions ?? 0);
      }
    }
  } catch (e) {
    console.error("Error fetching flows metrics:", e);
  }

  return { revenue, conversions };
}

async function countProfiles(headers: Record<string,string>) {
  try {
    const r = await fetch(`${KL_API_BASE}/profiles?per_page=1`, { headers });
    if (!r.ok) return 0;
    
    const totalHeader = r.headers.get("Klaviyo-Total-Count");
    if (totalHeader && !Number.isNaN(Number(totalHeader))) {
      return Number(totalHeader);
    }

    const d = await r.json().catch(() => ({}));
    const total = Number(d?.meta?.total ?? d?.data?.length ?? 0);
    return total;
  } catch (e) {
    console.error("Error counting profiles:", e);
    return 0;
  }
}

/** ===== Utils ===== */
function sumField(items: any[], field: string) {
  return items.reduce((a, x) => a + Number(x?.[field] ?? 0), 0);
}

function topN(items: any[], field: string, n: number) {
  return [...items].sort((a, b) => Number(b?.[field] || 0) - Number(a?.[field] || 0)).slice(0, n);
}

function pickCampaign(c: any) {
  return ({
    id: c.id,
    name: c.name,
    revenue: Number(c.revenue || 0),
    conversions: Number(c.conversions || 0),
    send_time: c.send_time,
    status: c.status || null
  });
}

function toDateToYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

function jerr(status: number, error: string, extra: Record<string, unknown> = {}) {
  return json({ error, hint: hint(error), ...extra }, status);
}

function hint(msg: string) {
  if (msg.includes("Missing required body")) return "Envie {storeId, from, to} no body JSON.";
  if (msg.includes("Invalid date range")) return "Use ISO UTC e garanta from < to.";
  if (msg.includes("integration not found")) return "Configure a integração Klaviyo para esta loja.";
  if (msg.includes("Missing Klaviyo private key")) return "Salve a chave privada da Klaviyo nas Integrações.";
  return "Verifique credenciais, versão da API e permissões.";
}

// TODO: implementar criptografia real se necessário
async function decrypt(v: string) {
  return v;
}