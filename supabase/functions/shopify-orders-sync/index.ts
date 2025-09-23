import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SHOPIFY_API_VER = "2023-10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    
    if (!storeId || !from || !to) {
      return jerr(400, "Missing required query params", { required: ["storeId", "from", "to"] });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(+fromDate) || isNaN(+toDate) || fromDate >= toDate) {
      return jerr(400, "Invalid date range", { from, to });
    }

    // Supabase (service role)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verificar acesso do usuário à loja
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jerr(401, "Authorization header required");
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return jerr(401, "Invalid user token");
    }

    // Verificar se o usuário tem acesso à loja
    const { data: userStore } = await supabase
      .from('v_user_stores')
      .select('*')
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .maybeSingle();

    if (!userStore) {
      return jerr(403, "Access denied to store");
    }

    // Buscar integração Shopify
    const { data: integ, error: iErr } = await supabase
      .from("integrations")
      .select("key_public, key_secret_encrypted")
      .eq("store_id", storeId)
      .eq("provider", "shopify")
      .maybeSingle();

    if (iErr || !integ) {
      return jerr(404, "Shopify integration not found", { storeId });
    }

    const domain = (integ.key_public ?? "").trim();
    const accessToken = await decrypt(integ.key_secret_encrypted ?? "");
    
    if (!domain || !domain.includes(".myshopify.com")) {
      return jerr(400, "Invalid Shopify domain", { domain });
    }
    
    if (!accessToken) {
      return jerr(400, "Missing Shopify access token");
    }

    // Log inicio da sincronização
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

    // Paginação
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
          "X-Shopify-Access-Token": accessToken, 
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`Shopify API error: ${resp.status} ${errorText}`);
        
        // Log error
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
        
        return jerr(resp.status, "Shopify API error", { 
          status: resp.status, 
          body: safe(errorText) 
        });
      }

      const data = await resp.json();
      orders = orders.concat(data.orders ?? []);

      const link = resp.headers.get("Link") || "";
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      pageInfo = m ? new URL(m[1]).searchParams.get("page_info") ?? undefined : undefined;
      
      if (orders.length > 20000) break; // trava de segurança
    } while (pageInfo);

    console.log(`Fetched ${orders.length} orders from Shopify`);

    // Upsert
    const rows = orders.map((o: any) => ({
      store_id: storeId,
      shopify_id: Number(o.id),
      code: o.name ?? null,
      total: Number(o.total_price ?? 0),
      currency: o.currency ?? "USD",
      created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
      customer_id_ext: o.customer?.id ? Number(o.customer.id) : null,
      customer_email: o.customer?.email ?? null,
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
        
        // Log error
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

    const totalRevenue = rows.reduce((a, r) => a + (r.total || 0), 0);
    
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

    return json({ 
      synced: rows.length, 
      totalRevenue, 
      currency: rows[0]?.currency ?? "USD" 
    });
    
  } catch (e) {
    console.error("Unexpected error:", e);
    return jerr(500, "Unexpected error", { error: String(e) });
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { 
      "Content-Type": "application/json", 
      ...corsHeaders 
    }
  });
}

function jerr(s: number, error: string, extra: Record<string, unknown> = {}) {
  return json({ error, hint: hint(error), ...extra }, s);
}

function hint(msg: string) {
  if (msg.includes("Missing required")) return "Envie storeId, from, to (ISO)";
  if (msg.includes("Invalid date range")) return "Cheque período (from < to, ISO UTC)";
  if (msg.includes("integration not found")) return "Cadastre Shopify na loja em Configurações > Integrações";
  if (msg.includes("Invalid Shopify domain")) return "Use o domínio .myshopify.com";
  if (msg.includes("Missing Shopify access token")) return "Salve o Access Token Admin na integração";
  return "Verifique credenciais e permissões";
}

function safe(s: string) {
  return s.slice(0, 1000);
}

async function decrypt(v: string) {
  // Por enquanto retorna como está - trocar por AES/secret real em produção
  return v;
}