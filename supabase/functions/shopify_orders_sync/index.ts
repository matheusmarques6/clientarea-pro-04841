import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHOPIFY_API_VER = "2023-10";

serve(async (req) => {
  // ✅ CORS/preflight: evita 404 em OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }

  try {
    // ✅ Aceita body JSON ou query params (fallback)
    const url = new URL(req.url);
    let body: any = {};
    if (req.headers.get("content-type")?.includes("application/json")) {
      try { body = await req.json(); } catch { body = {}; }
    }

    const storeId = body.storeId ?? url.searchParams.get("storeId") ?? "";
    const from    = body.from    ?? url.searchParams.get("from")    ?? "";
    const to      = body.to      ?? url.searchParams.get("to")      ?? "";

    if (!storeId || !from || !to) {
      return jerr(400, "Missing required params", { required: ["storeId","from","to"] });
    }
    const fromDate = new Date(from), toDate = new Date(to);
    if (isNaN(+fromDate) || isNaN(+toDate) || fromDate >= toDate) {
      return jerr(400, "Invalid date range", { from, to });
    }

    // ✅ Supabase: usar SERVICE ROLE (passa RLS com segurança em funções)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    console.log(`Starting Shopify sync for store ${storeId}, period ${from} to ${to}`);
    
    const { data: logData } = await supabase
      .from("sync_logs")
      .insert({
        store_id: storeId,
        provider: "shopify",
        sync_type: "orders",
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    const logId = logData?.id;

    // 🔐 Buscar integração Shopify
    const { data: integ, error: iErr } = await supabase
      .from("integrations")
      .select("key_public, key_secret_encrypted")
      .eq("store_id", storeId)
      .eq("provider", "shopify")
      .maybeSingle();

    if (iErr || !integ) {
      if (logId) {
        await supabase
          .from("sync_logs")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            message: "Shopify integration not found",
          })
          .eq("id", logId);
      }
      return jerr(404, "Shopify integration not found", { storeId });
    }

    const domain = (integ.key_public ?? "").trim();
    const token  = await decrypt(integ.key_secret_encrypted ?? "");
    if (!domain || !domain.includes(".myshopify.com")) {
      if (logId) {
        await supabase
          .from("sync_logs")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            message: "Invalid Shopify domain",
          })
          .eq("id", logId);
      }
      return jerr(400, "Invalid Shopify domain", { domain });
    }
    if (!token) {
      if (logId) {
        await supabase
          .from("sync_logs")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            message: "Missing Shopify access token",
          })
          .eq("id", logId);
      }
      return jerr(400, "Missing Shopify access token");
    }

    // 🔁 Paginação
    let orders: any[] = [];
    let pageInfo: string | undefined;

    do {
      const qs = new URLSearchParams({
        status: "any",
        created_at_min: fromDate.toISOString(),
        created_at_max: toDate.toISOString(),
        limit: "250",
        ...(pageInfo ? { page_info: pageInfo } : {})
      });

      const resp = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VER}/orders.json?${qs}`, {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });

      if (!resp.ok) {
        const text = await resp.text().catch(()=>"");
        console.error(`Shopify API error: ${resp.status} ${text}`);
        
        if (logId) {
          await supabase
            .from("sync_logs")
            .update({
              status: "error",
              finished_at: new Date().toISOString(),
              message: `Shopify API error: ${resp.status}`,
            })
            .eq("id", logId);
        }
        
        return jerr(resp.status, "Shopify API error", { status: resp.status, body: text.slice(0,1500) });
      }

      const data = await safeJson(resp);
      const batch = Array.isArray(data?.orders) ? data.orders : [];
      orders = orders.concat(batch);

      const link = resp.headers.get("Link") || "";
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      pageInfo = m ? new URL(m[1]).searchParams.get("page_info") ?? undefined : undefined;

      if (orders.length > 20000) break; // trava
    } while (pageInfo);

    console.log(`Fetched ${orders.length} orders from Shopify`);

    // 🗺️ Map + upsert
    const rows = orders.map((o:any) => ({
      store_id: storeId,
      shopify_id: Number(o.id),
      code: o.name ?? null,
      total: Number(o.total_price ?? 0),
      currency: o.currency ?? "USD",
      created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
      customer_id_ext: o.customer?.id ? Number(o.customer.id) : null,
      customer_email:  o.customer?.email ?? null,
      channel_attrib: "none",
      raw: o,
      status: o.financial_status ?? null,
    }));

    if (rows.length) {
      const { error: uErr } = await supabase
        .from("orders")
        .upsert(rows, { onConflict: "shopify_id" });
      
      if (uErr) {
        console.error("DB upsert error:", uErr);
        
        if (logId) {
          await supabase
            .from("sync_logs")
            .update({
              status: "error",
              finished_at: new Date().toISOString(),
              message: `DB upsert error: ${uErr.message}`,
            })
            .eq("id", logId);
        }
        
        return jerr(500, "DB upsert error (orders)", { details: uErr.message });
      }
    }

    const totalRevenue = rows.reduce((a,r)=>a+(r.total||0),0);
    
    // Log sucesso
    if (logId) {
      await supabase
        .from("sync_logs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          records_processed: rows.length,
          message: `Successfully synced ${rows.length} orders`,
        })
        .eq("id", logId);
    }

    console.log(`Successfully synced ${rows.length} orders, total revenue: ${totalRevenue}`);
    
    return json({ synced: rows.length, totalRevenue, currency: rows[0]?.currency ?? "USD" });

  } catch (e) {
    console.error("Unexpected error:", e);
    return jerr(500, "Unexpected error", { error: String(e) });
  }
});

// Helpers
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type":"application/json", ...cors() } });
}

function jerr(status:number, error:string, extra:Record<string,unknown>={}) {
  return json({ error, hint: hint(error), ...extra }, status);
}

function hint(msg:string){
  if (msg.includes("Missing required")) return "Envie {storeId, from, to} no body JSON ou como query params.";
  if (msg.includes("Invalid date range")) return "Use ISO UTC e garanta from < to.";
  if (msg.includes("integration not found")) return "Cadastre Shopify em Configurações > Integrações desta loja.";
  if (msg.includes("Invalid Shopify domain")) return "Informe domínio .myshopify.com válido.";
  if (msg.includes("Missing Shopify access token")) return "Informe o Admin Access Token na integração.";
  if (msg.includes("Shopify API error")) return "Cheque permissões do token e versão da API.";
  if (msg.includes("DB upsert error")) return "Revise migrations/índices/RLS de 'orders'.";
  return "Verifique parâmetros, credenciais e logs.";
}

async function safeJson(resp: Response){
  const text = await resp.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// TODO: implementar AES real se necessário
async function decrypt(v:string){ return v; }