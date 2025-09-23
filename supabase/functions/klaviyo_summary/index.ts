import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Max-Age": "86400",
};

// Webhook URL do n8n para buscar dados do Klaviyo
const N8N_WEBHOOK_URL = "https://n8n-n8n.1fpac5.easypanel.host/webhook/klaviyo/summary";

serve(async (req) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { 
      status, 
      headers: { "Content-Type": "application/json", ...CORS_HEADERS } 
    });

  const bad = (msg: string, extra: Record<string, unknown> = {}) => json({ error: msg, ...extra }, 400);
  const authErr = () => json({ error: "Missing/invalid Authorization bearer token" }, 401);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return authErr();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const payload = (body ?? {}) as {
    storeId?: string;
    from?: string;
    to?: string;
    fast?: boolean;
  };

  const { storeId, from, to, fast } = payload;
  if (!storeId || !from || !to) {
    return bad("Missing required fields", { required: ["storeId","from","to"] });
  }

  const fromDate = new Date(from), toDate = new Date(to);
  if (Number.isNaN(+fromDate) || Number.isNaN(+toDate) || +fromDate >= +toDate) return bad("Invalid date range");

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Processing request for store ${storeId} from ${from} to ${to}`);

  // RLS client (usa o token do usuário)
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  // Service role client for writing channel_revenue
  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 1) Verificar se existe integração Klaviyo para a loja (RLS)
    const { data: integ, error: integErr } = await supa
      .from("integrations")
      .select("*")
      .eq("store_id", storeId)
      .eq("provider", "klaviyo")
      .maybeSingle();

    if (integErr || !integ) {
      console.log(`[${requestId}] Klaviyo integration not found for store ${storeId}`);
      return json({
        klaviyo: {
          revenue_total: 0,
          revenue_campaigns: 0,
          revenue_flows: 0,
          orders_attributed: 0,
          conversions_campaigns: 0,
          conversions_flows: 0,
          top_campaigns_by_revenue: [],
          top_campaigns_by_conversions: [],
          top_flows_by_revenue: [],
          leads_total: 0,
          campaign_count: 0,
          flow_count: 0,
          campaigns_with_revenue: 0,
          flows_with_revenue: 0,
          flows_detailed: []
        },
        period: { start: from, end: to },
        store: { id: storeId },
        metadata: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          version: "4.0",
          webhook_integration: true
        },
        status: "NO_INTEGRATION",
        summary: {
          total_revenue: 0,
          total_orders: 0,
          average_order_value: 0,
          channel_revenue_synced: false
        }
      });
    }

    console.log(`[${requestId}] Klaviyo integration found, calling n8n webhook`);

    // 2) Chamar o webhook do n8n
    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId,
        from,
        to,
        fast: fast || false,
        requestId
      })
    });

    if (!webhookResponse.ok) {
      console.error(`[${requestId}] Webhook error:`, webhookResponse.status, webhookResponse.statusText);
      throw new Error(`Webhook returned ${webhookResponse.status}: ${webhookResponse.statusText}`);
    }

    const webhookData = await webhookResponse.json();
    console.log(`[${requestId}] Webhook response received successfully`);

    // 3) Processar resposta do webhook
    const klaviyoData = webhookData.klaviyo || {};
    const revenueTotal = Number(klaviyoData.revenue_total || 0);
    const ordersAttributed = Number(klaviyoData.orders_attributed || 0);
    const leadsTotal = Number(klaviyoData.leads_total || 0);

    // 4) Cachear no banco (klaviyo_summaries)
    const { error: cacheError } = await supabaseService
      .from('klaviyo_summaries')
      .upsert({
        store_id: storeId,
        period_start: from,
        period_end: to,
        revenue_total: revenueTotal,
        revenue_campaigns: Number(klaviyoData.revenue_campaigns || 0),
        revenue_flows: Number(klaviyoData.revenue_flows || 0),
        orders_attributed: ordersAttributed,
        leads_total: leadsTotal,
        top_campaigns_by_revenue: klaviyoData.top_campaigns_by_revenue || [],
        top_campaigns_by_conversions: klaviyoData.top_campaigns_by_conversions || []
      }, {
        onConflict: 'store_id,period_start,period_end'
      });

    if (cacheError) {
      console.warn(`[${requestId}] Cache error:`, cacheError);
    } else {
      console.log(`[${requestId}] Cached results in klaviyo_summaries`);
    }

    // 5) Persistir no channel_revenue para KPIs do dashboard
    if (revenueTotal > 0 || ordersAttributed > 0) {
      const { error: channelError } = await supabaseService
        .from('channel_revenue')
        .upsert({
          store_id: storeId,
          channel: 'email',
          source: 'klaviyo',
          period_start: from,
          period_end: to,
          revenue: revenueTotal,
          orders_count: ordersAttributed,
          currency: 'BRL',
          raw: klaviyoData
        }, {
          onConflict: 'store_id,channel,source,period_start,period_end'
        });

      if (channelError) {
        console.warn(`[${requestId}] Channel revenue error:`, channelError);
      } else {
        console.log(`[${requestId}] Successfully persisted to channel_revenue: ${revenueTotal} revenue, ${ordersAttributed} orders`);
      }
    }

    // 6) Retornar resposta formatada
    const response = {
      klaviyo: {
        revenue_total: revenueTotal,
        revenue_campaigns: Number(klaviyoData.revenue_campaigns || 0),
        revenue_flows: Number(klaviyoData.revenue_flows || 0),
        orders_attributed: ordersAttributed,
        conversions_campaigns: Number(klaviyoData.conversions_campaigns || 0),
        conversions_flows: Number(klaviyoData.conversions_flows || 0),
        top_campaigns_by_revenue: klaviyoData.top_campaigns_by_revenue || [],
        top_campaigns_by_conversions: klaviyoData.top_campaigns_by_conversions || [],
        top_flows_by_revenue: klaviyoData.top_flows_by_revenue || [],
        leads_total: leadsTotal,
        campaign_count: Number(klaviyoData.campaign_count || 0),
        flow_count: Number(klaviyoData.flow_count || 0),
        campaigns_with_revenue: Number(klaviyoData.campaigns_with_revenue || 0),
        flows_with_revenue: Number(klaviyoData.flows_with_revenue || 0),
        flows_detailed: klaviyoData.flows_detailed || []
      },
      period: { start: from, end: to },
      store: { id: storeId, domain: integ.extra?.domain || 'webhook' },
      metadata: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: "4.0",
        webhook_integration: true
      },
      status: revenueTotal > 0 || ordersAttributed > 0 ? "SUCCESS" : "NO_DATA",
      summary: {
        total_revenue: revenueTotal,
        total_orders: ordersAttributed,
        average_order_value: ordersAttributed > 0 ? revenueTotal / ordersAttributed : 0,
        channel_revenue_synced: true
      }
    };

    console.log(`[${requestId}] Klaviyo Summary completed successfully`);
    console.log(`[${requestId}] Results: ${revenueTotal} revenue, ${ordersAttributed} orders, ${leadsTotal} leads`);

    return json(response);

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return json({
      error: "Webhook integration failed",
      details: errorMessage,
      klaviyo: {
        revenue_total: 0,
        revenue_campaigns: 0,
        revenue_flows: 0,
        orders_attributed: 0,
        conversions_campaigns: 0,
        conversions_flows: 0,
        top_campaigns_by_revenue: [],
        top_campaigns_by_conversions: [],
        top_flows_by_revenue: [],
        leads_total: 0,
        campaign_count: 0,
        flow_count: 0,
        campaigns_with_revenue: 0,
        flows_with_revenue: 0,
        flows_detailed: []
      },
      period: { start: from, end: to },
      store: { id: storeId },
      metadata: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        version: "4.0",
        webhook_integration: true
      },
      status: "ERROR",
      summary: {
        total_revenue: 0,
        total_orders: 0,
        average_order_value: 0,
        channel_revenue_synced: false
      }
    }, 500);
  }
});