import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Max-Age": "86400",
};

// Definir tipos para melhor type safety
interface KlaviyoMetric {
  id: string;
  attributes: {
    name: string;
    definition: string;
  };
}

interface KlaviyoCampaign {
  id: string;
  attributes: {
    name: string;
    send_time?: string;
    scheduled_at?: string;
    created_at?: string;
    updated_at?: string;
    status?: string;
  };
}

interface KlaviyoFlow {
  id: string;
  attributes: {
    name: string;
    status: string;
    created?: string;
    updated?: string;
  };
}

interface CampaignMetrics {
  id: string;
  name: string;
  revenue: number;
  conversions: number;
  send_time?: string;
  status?: string;
}

interface FlowMetrics {
  id: string;
  name: string;
  revenue: number;
  conversions: number;
  performance: {
    opens: number;
    opens_unique: number;
    clicks: number;
    clicks_unique: number;
    deliveries: number;
    bounces: number;
    unsubscribes: number;
    open_rate: number;
    click_rate: number;
    conversion_rate: number;
  };
}

const KLAVIYO_REVISION = Deno.env.get('KLAVIYO_REVISION') || '2024-10-15';
const DEFAULT_METRIC_ID = 'W8Gk3c'; // Fallback metric ID

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

  // Limites para evitar timeout 504 - Otimizado para performance
  const PAGE_LIMIT = fast ? 1 : 2;        // máx. páginas (reduzido)
  const CONCURRENCY = 3;                   // máx. requisições paralelas (aumentado)
  const REQ_TIMEOUT_MS = 12000;           // timeout por request a Klaviyo

  const withTimeout = async <T>(promise: Promise<T>, ms: number, context?: string): Promise<T> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutMessage = context ? `${context} timed out after ${ms}ms` : `Request timed out after ${ms}ms`;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  };

  try {
    // 1) Ler integração (klaviyo) por storeId via RLS
    const { data: integ, error: integErr } = await supa
      .from("integrations")
      .select("provider, key_secret_encrypted, key_public")
      .eq("provider", "klaviyo")
      .eq("store_id", storeId)
      .maybeSingle();

    if (integErr) return json({ error: "Failed to read integrations", detail: integErr.message }, 500);
    if (!integ?.key_secret_encrypted) return bad("Klaviyo integration not configured for this store");

    console.log(`[${requestId}] Klaviyo integration found`);

    const klaviyoApiKey = integ.key_secret_encrypted;
    const klaviyoSiteId = integ.key_public;

    // Setup Klaviyo API headers
    const klaviyoHeaders = {
      'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
      'Accept': 'application/json',
      'revision': KLAVIYO_REVISION
    };

    // Helper function to make Klaviyo requests with retry logic
    const makeKlaviyoRequest = async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              ...klaviyoHeaders,
              ...(options.headers || {})
            }
          });

          if (response.status === 429 && attempt < retries) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(Math.pow(2, attempt) * 1000, 5000);
            console.log(`[${requestId}] Rate limited, waiting ${delay}ms before retry ${attempt}/${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          return response;
        } catch (error) {
          if (attempt === retries) throw error;
          const delay = Math.min(Math.pow(2, attempt) * 1000, 5000);
          const message = error instanceof Error ? error.message : String(error);
          console.log(`[${requestId}] Request failed, retrying in ${delay}ms (${attempt}/${retries}):`, message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw new Error('Max retries exceeded');
    };

    // Helper function to paginate through Klaviyo API com limites
    const paginateKlaviyoAPI = async <T>(url: string, maxPages = PAGE_LIMIT): Promise<T[]> => {
      const results: T[] = [];
      let currentUrl = url;
      let pageCount = 0;

      while (currentUrl && pageCount < maxPages) {
        const response = await withTimeout(
          makeKlaviyoRequest(currentUrl),
          REQ_TIMEOUT_MS,
          `paginate:${currentUrl}`
        );

        if (!response.ok) {
          console.error(`[${requestId}] API error:`, response.status, await response.text());
          break;
        }

        const data = (await response.json()) as { data?: T[]; links?: { next?: string | null } };
        if (Array.isArray(data.data)) {
          results.push(...data.data);
        }

        currentUrl = data.links?.next ?? null;
        pageCount++;

        if (pageCount >= maxPages) {
          console.warn(`[${requestId}] Reached pagination limit of ${maxPages} pages`);
        }
      }

      return results;
    };

    // Step 1: Resolve "Placed Order" metric ID
    console.log(`[${requestId}] Step 1: Resolving Placed Order metric ID`);
    let metricId = DEFAULT_METRIC_ID;
    
    try {
      const metricsResponse = await makeKlaviyoRequest('https://a.klaviyo.com/api/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        const placedOrderMetric = metricsData.data?.find((metric: KlaviyoMetric) => 
          metric.attributes.name === "Placed Order"
        );
        
        if (placedOrderMetric) {
          metricId = placedOrderMetric.id;
          console.log(`[${requestId}] Found Placed Order metric: ${metricId}`);
        } else {
          console.log(`[${requestId}] Placed Order metric not found, using fallback: ${metricId}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${requestId}] Error fetching metrics, using fallback:`, message);
    }

    // Step 2: Get email campaigns
    console.log(`[${requestId}] Step 2: Fetching email campaigns`);
    const campaignsUrl = 'https://a.klaviyo.com/api/campaigns?filter=equals(messages.channel,"email")';
    const campaigns = await paginateKlaviyoAPI<KlaviyoCampaign>(campaignsUrl);
    
    console.log(`[${requestId}] Found ${campaigns.length} email campaigns`);

    // Filter campaigns by period (prioritize send_time, fallback to scheduled_at, created_at, updated_at)
    const campaignsInPeriod = campaigns.filter(campaign => {
      const sendTime = campaign.attributes.send_time || 
                      campaign.attributes.scheduled_at || 
                      campaign.attributes.created_at || 
                      campaign.attributes.updated_at;
      
      if (!sendTime) return false;
      
      const campaignDate = new Date(sendTime);
      return campaignDate >= fromDate && campaignDate <= toDate;
    });

    console.log(`[${requestId}] ${campaignsInPeriod.length} campaigns in period`);

    // Step 3: Get campaign metrics in batches to avoid rate limits
    const campaignMetrics: CampaignMetrics[] = [];
    let totalCampaignRevenue = 0;
    let totalCampaignConversions = 0;

    // Process campaigns in batches with improved concurrency
    const batchSize = CONCURRENCY;
    for (let i = 0; i < campaignsInPeriod.length; i += batchSize) {
      const batch = campaignsInPeriod.slice(i, i + batchSize);
      
      await Promise.allSettled(batch.map(async (campaign) => {
        try {
          const metricsResponse = await withTimeout(
            makeKlaviyoRequest('https://a.klaviyo.com/api/campaign-values-reports/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  type: 'campaign-values-report',
                  attributes: {
                    timeframe: { 
                      start: `${from}T00:00:00Z`, 
                      end: `${to}T23:59:59Z` 
                    },
                    conversion_metric_id: metricId,
                    filter: `equals(campaign_id,"${campaign.id}")`,
                    statistics: ["conversion_value", "conversions"]
                  }
                }
              })
            }),
            REQ_TIMEOUT_MS,
            `campaign:${campaign.id}`
          );

          if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            const revenue = metricsData.data?.attributes?.conversion_value || 0;
            const conversions = metricsData.data?.attributes?.conversions || 0;

            if (revenue > 0 || conversions > 0) {
              campaignMetrics.push({
                id: campaign.id,
                name: campaign.attributes.name,
                revenue,
                conversions,
                send_time: campaign.attributes.send_time,
                status: campaign.attributes.status
              });

              totalCampaignRevenue += revenue;
              totalCampaignConversions += conversions;
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[${requestId}] Error fetching metrics for campaign ${campaign.id}:`, message);
        }
      }));

      // Smaller delay between batches for better performance
      if (i + batchSize < campaignsInPeriod.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 4: Get flows (with optimizations)
    console.log(`[${requestId}] Step 4: Fetching flows`);
    const flowsUrl = 'https://a.klaviyo.com/api/flows';
    const allFlows = await paginateKlaviyoAPI<KlaviyoFlow>(flowsUrl);
    
    // Filter active flows
    const activeFlows = allFlows.filter(flow => 
      ['live', 'manual'].includes(flow.attributes.status)
    );

    console.log(`[${requestId}] Found ${activeFlows.length} active flows out of ${allFlows.length} total`);

    // Step 5: Get total flow revenue (optimized)
    let totalFlowRevenue = 0;
    let totalFlowConversions = 0;

    try {
      const flowRevenueResponse = await withTimeout(
        makeKlaviyoRequest('https://a.klaviyo.com/api/flow-values-reports/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              type: 'flow-values-report',
              attributes: {
                timeframe: {
                  start: `${from}T00:00:00Z`,
                  end: `${to}T23:59:59Z`
                },
                conversion_metric_id: metricId,
                statistics: ["conversion_value", "conversions"]
              }
            }
          })
        }),
        REQ_TIMEOUT_MS,
        'flow:aggregate'
      );

      if (flowRevenueResponse.ok) {
        const flowRevenueData = await flowRevenueResponse.json();
        totalFlowRevenue = flowRevenueData.data?.attributes?.conversion_value || 0;
        totalFlowConversions = flowRevenueData.data?.attributes?.conversions || 0;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${requestId}] Error fetching total flow revenue:`, message);
    }

    // Step 6: Get top flow metrics (limited for performance)
    const flowMetrics: FlowMetrics[] = [];
    const topFlowsToProcess = activeFlows.slice(0, 10); // Limit to top 10 flows for performance

    // Process flows in batches with timeout
    const flowBatchSize = Math.min(CONCURRENCY, 3);
    for (let i = 0; i < topFlowsToProcess.length; i += flowBatchSize) {
      const batch = topFlowsToProcess.slice(i, i + flowBatchSize);
      
      await Promise.allSettled(batch.map(async (flow) => {
        try {
          const flowValueResponse = await withTimeout(
            makeKlaviyoRequest('https://a.klaviyo.com/api/flow-values-reports/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  type: 'flow-values-report',
                  attributes: {
                    timeframe: { 
                      start: `${from}T00:00:00Z`, 
                      end: `${to}T23:59:59Z` 
                    },
                    conversion_metric_id: metricId,
                    filter: `equals(flow_id,"${flow.id}")`,
                    statistics: ["conversion_value", "conversions"]
                  }
                }
              })
            }),
            REQ_TIMEOUT_MS,
            `flow:${flow.id}`
          );

          let flowRevenue = 0;
          let flowConversions = 0;

          if (flowValueResponse.ok) {
            const flowValueData = await flowValueResponse.json();
            flowRevenue = flowValueData.data?.attributes?.conversion_value || 0;
            flowConversions = flowValueData.data?.attributes?.conversions || 0;
          }

          // Simplified performance calculation
          const performance = {
            opens: 0,
            opens_unique: 0,
            clicks: 0,
            clicks_unique: 0,
            deliveries: 0,
            bounces: 0,
            unsubscribes: 0,
            open_rate: 0,
            click_rate: 0,
            conversion_rate: 0
          };

          // Add to results if has revenue
          if (flowRevenue > 0) {
            flowMetrics.push({
              id: flow.id,
              name: flow.attributes.name,
              revenue: flowRevenue,
              conversions: flowConversions,
              performance
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[${requestId}] Error fetching metrics for flow ${flow.id}:`, message);
        }
      }));

      // Smaller delay between batches
      if (i + flowBatchSize < topFlowsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 7: Get profile count (leads)
    console.log(`[${requestId}] Step 7: Fetching profile count`);
    let leadsTotal = 0;

    try {
      const profilesResponse = await makeKlaviyoRequest('https://a.klaviyo.com/api/profiles?page[size]=1');
      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json();
        leadsTotal = profilesData.meta?.total || profilesData.meta?.page?.total || profilesData.data?.length || 0;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${requestId}] Error fetching profiles:`, message);
    }

    // Step 8: Sort and get top lists
    const topCampaignsByRevenue = campaignMetrics
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const topCampaignsByConversions = campaignMetrics
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);

    const topFlowsByRevenue = flowMetrics
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Step 9: Calculate summary metrics
    const totalRevenue = totalCampaignRevenue + totalFlowRevenue;
    const totalOrders = totalCampaignConversions + totalFlowConversions;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Step 10: Cache result in klaviyo_summaries
    try {
      await supabaseService
        .from('klaviyo_summaries')
        .upsert({
          store_id: storeId,
          period_start: from,
          period_end: to,
          revenue_total: totalRevenue,
          revenue_campaigns: totalCampaignRevenue,
          revenue_flows: totalFlowRevenue,
          orders_attributed: totalOrders,
          leads_total: leadsTotal,
          top_campaigns_by_revenue: topCampaignsByRevenue,
          top_campaigns_by_conversions: topCampaignsByConversions
        }, { 
          onConflict: 'store_id,period_start,period_end' 
        });

      console.log(`[${requestId}] Cached results in klaviyo_summaries`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${requestId}] Error caching klaviyo_summaries:`, message);
    }

    // Step 11: CRITICAL - Persist to channel_revenue for dashboard integration
    try {
      console.log(`[${requestId}] Step 11: Persisting to channel_revenue`);
      
      // Upsert email channel revenue
      await supabaseService
        .from('channel_revenue')
        .upsert({
          store_id: storeId,
          channel: 'email',
          source: 'klaviyo',
          period_start: from,
          period_end: to,
          revenue: totalRevenue,
          orders_count: totalOrders,
          currency: 'BRL', // TODO: Get from store settings
          raw: {
            campaigns: {
              total_revenue: totalCampaignRevenue,
              total_conversions: totalCampaignConversions,
              count: campaignMetrics.length,
              top_performers: topCampaignsByRevenue
            },
            flows: {
              total_revenue: totalFlowRevenue,
              total_conversions: totalFlowConversions,
              count: flowMetrics.length,
              top_performers: topFlowsByRevenue
            },
            leads_total: leadsTotal,
            synced_at: new Date().toISOString(),
            request_id: requestId
          }
        }, { 
          onConflict: 'store_id,channel,source,period_start,period_end'
        });

      console.log(`[${requestId}] Successfully persisted to channel_revenue: ${totalRevenue} revenue, ${totalOrders} orders`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${requestId}] CRITICAL ERROR persisting to channel_revenue:`, message);
      // Don't fail the request, but log the error for monitoring
    }

    // Step 12: Build final response
    const response = {
      klaviyo: {
        revenue_total: totalRevenue,
        revenue_campaigns: totalCampaignRevenue,
        revenue_flows: totalFlowRevenue,
        orders_attributed: totalOrders,
        conversions_campaigns: totalCampaignConversions,
        conversions_flows: totalFlowConversions,
        top_campaigns_by_revenue: topCampaignsByRevenue,
        top_campaigns_by_conversions: topCampaignsByConversions,
        top_flows_by_revenue: topFlowsByRevenue,
        leads_total: leadsTotal,
        campaign_count: campaigns.length,
        flow_count: activeFlows.length,
        campaigns_with_revenue: campaignMetrics.length,
        flows_with_revenue: flowMetrics.length,
        flows_detailed: flowMetrics
      },
      period: { start: from, end: to },
      store: { id: storeId, domain: klaviyoSiteId || "" },
      metadata: { 
        metric_id: metricId, 
        request_id: requestId, 
        timestamp: new Date().toISOString(), 
        version: "3.0",
        performance_optimized: true
      },
      status: totalRevenue > 0 || totalOrders > 0 ? "SUCCESS" : "NO_DATA",
      summary: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        average_order_value: avgOrderValue,
        channel_revenue_synced: true
      }
    };

    console.log(`[${requestId}] Klaviyo Summary completed successfully`);
    console.log(`[${requestId}] Results: ${totalRevenue} revenue, ${totalOrders} orders, ${leadsTotal} leads`);

    return json(response, 200);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[${requestId}] Error in klaviyo_summary:`, detail);
    return json({ error: "Klaviyo summary failed", detail }, 502);
  }
});