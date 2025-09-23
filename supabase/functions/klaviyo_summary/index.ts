import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Klaviyo Summary API Started`);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and extract body
    const body = await req.json();
    const { storeId, from, to } = body;

    if (!storeId || !from || !to) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: storeId, from, to'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate date format and range
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return new Response(JSON.stringify({
        error: 'Invalid date format. Use YYYY-MM-DD'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (fromDate >= toDate) {
      return new Response(JSON.stringify({
        error: 'Start date must be before end date'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${requestId}] Processing request for store ${storeId} from ${from} to ${to}`);

    // Initialize Supabase client with user token for RLS
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Verify user has access to store via RLS
    const { data: userStore, error: storeError } = await supabase
      .from('v_user_stores')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (storeError || !userStore) {
      console.error(`[${requestId}] Store access error:`, storeError);
      return new Response(JSON.stringify({ error: 'Access denied to store' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Klaviyo integration data
    const { data: klaviyoIntegration, error: integrationError } = await supabase
      .from('integrations')
      .select('key_secret_encrypted, key_public')
      .eq('store_id', storeId)
      .eq('provider', 'klaviyo')
      .single();

    if (integrationError || !klaviyoIntegration) {
      console.error(`[${requestId}] Klaviyo integration not found:`, integrationError);
      return new Response(JSON.stringify({
        error: 'Klaviyo integration not configured for this store'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const klaviyoApiKey = klaviyoIntegration.key_secret_encrypted;
    const klaviyoSiteId = klaviyoIntegration.key_public;

    if (!klaviyoApiKey) {
      return new Response(JSON.stringify({
        error: 'Klaviyo API key not configured'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${requestId}] Klaviyo integration found, site_id: ${klaviyoSiteId ? 'yes' : 'no'}`);

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
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
            console.log(`[${requestId}] Rate limited, waiting ${delay}ms before retry ${attempt}/${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          return response;
        } catch (error) {
          if (attempt === retries) throw error;
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[${requestId}] Request failed, retrying in ${delay}ms (${attempt}/${retries}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw new Error('Max retries exceeded');
    };

    // Helper function to paginate through Klaviyo API
    const paginateKlaviyoAPI = async (url: string, maxPages = 10): Promise<any[]> => {
      const results: any[] = [];
      let currentUrl = url;
      let pageCount = 0;

      while (currentUrl && pageCount < maxPages) {
        const response = await makeKlaviyoRequest(currentUrl);
        
        if (!response.ok) {
          console.error(`[${requestId}] API error:`, response.status, await response.text());
          break;
        }

        const data = await response.json();
        results.push(...(data.data || []));
        
        currentUrl = data.links?.next || null;
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
      console.warn(`[${requestId}] Error fetching metrics, using fallback:`, error.message);
    }

    // Step 2: Get email campaigns
    console.log(`[${requestId}] Step 2: Fetching email campaigns`);
    const campaignsUrl = 'https://a.klaviyo.com/api/campaigns?filter=equals(messages.channel,"email")';
    const campaigns: KlaviyoCampaign[] = await paginateKlaviyoAPI(campaignsUrl);
    
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

    // Step 3: Get campaign metrics
    const campaignMetrics: CampaignMetrics[] = [];
    let totalCampaignRevenue = 0;
    let totalCampaignConversions = 0;

    for (const campaign of campaignsInPeriod) {
      try {
        const metricsResponse = await makeKlaviyoRequest('https://a.klaviyo.com/api/campaign-values-reports/', {
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
        });

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

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`[${requestId}] Error fetching metrics for campaign ${campaign.id}:`, error.message);
      }
    }

    // Step 4: Get flows
    console.log(`[${requestId}] Step 4: Fetching flows`);
    const flowsUrl = 'https://a.klaviyo.com/api/flows';
    const allFlows: KlaviyoFlow[] = await paginateKlaviyoAPI(flowsUrl);
    
    // Filter active flows
    const activeFlows = allFlows.filter(flow => 
      ['live', 'manual'].includes(flow.attributes.status)
    );

    console.log(`[${requestId}] Found ${activeFlows.length} active flows out of ${allFlows.length} total`);

    // Step 5: Get total flow revenue
    let totalFlowRevenue = 0;
    let totalFlowConversions = 0;

    try {
      const flowRevenueResponse = await makeKlaviyoRequest('https://a.klaviyo.com/api/flow-values-reports/', {
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
              statistics: ["conversion_value", "conversions", "conversion_uniques"]
            }
          }
        })
      });

      if (flowRevenueResponse.ok) {
        const flowRevenueData = await flowRevenueResponse.json();
        totalFlowRevenue = flowRevenueData.data?.attributes?.conversion_value || 0;
        totalFlowConversions = flowRevenueData.data?.attributes?.conversions || 0;
      }
    } catch (error) {
      console.warn(`[${requestId}] Error fetching total flow revenue:`, error.message);
    }

    // Step 6: Get individual flow metrics and performance
    const flowMetrics: FlowMetrics[] = [];
    let flowsWithRevenue = 0;
    let flowsWithActivity = 0;
    let totalFlowOpens = 0;
    let totalFlowClicks = 0;
    let totalFlowDeliveries = 0;

    for (const flow of activeFlows) {
      try {
        // Get flow revenue
        const flowValueResponse = await makeKlaviyoRequest('https://a.klaviyo.com/api/flow-values-reports/', {
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
        });

        let flowRevenue = 0;
        let flowConversions = 0;

        if (flowValueResponse.ok) {
          const flowValueData = await flowValueResponse.json();
          flowRevenue = flowValueData.data?.attributes?.conversion_value || 0;
          flowConversions = flowValueData.data?.attributes?.conversions || 0;
        }

        // Get flow performance
        const flowPerformanceResponse = await makeKlaviyoRequest('https://a.klaviyo.com/api/flow-series-reports/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              type: 'flow-series-report',
              attributes: {
                timeframe: { 
                  start: `${from}T00:00:00Z`, 
                  end: `${to}T23:59:59Z` 
                },
                filter: `equals(flow_id,"${flow.id}")`,
                interval: 'day',
                statistics: ["opens", "opens_unique", "clicks", "clicks_unique", "deliveries", "bounces", "unsubscribes"]
              }
            }
          })
        });

        let performance = {
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

        if (flowPerformanceResponse.ok) {
          const flowPerformanceData = await flowPerformanceResponse.json();
          const seriesData = flowPerformanceData.data || [];
          
          // Aggregate performance data
          for (const dayData of seriesData) {
            const attrs = dayData.attributes || {};
            performance.opens += attrs.opens || 0;
            performance.opens_unique += attrs.opens_unique || 0;
            performance.clicks += attrs.clicks || 0;
            performance.clicks_unique += attrs.clicks_unique || 0;
            performance.deliveries += attrs.deliveries || 0;
            performance.bounces += attrs.bounces || 0;
            performance.unsubscribes += attrs.unsubscribes || 0;
          }

          // Calculate rates
          if (performance.deliveries > 0) {
            performance.open_rate = performance.opens / performance.deliveries;
            performance.click_rate = performance.clicks / performance.deliveries;
          }
          if (performance.opens > 0) {
            performance.conversion_rate = flowConversions / performance.opens;
          }
        }

        // Track aggregates
        if (flowRevenue > 0) flowsWithRevenue++;
        if (performance.deliveries > 0) flowsWithActivity++;
        
        totalFlowOpens += performance.opens;
        totalFlowClicks += performance.clicks;
        totalFlowDeliveries += performance.deliveries;

        // Add to results if has revenue or activity
        if (flowRevenue > 0 || performance.deliveries > 0) {
          flowMetrics.push({
            id: flow.id,
            name: flow.attributes.name,
            revenue: flowRevenue,
            conversions: flowConversions,
            performance
          });
        }

        // Delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.warn(`[${requestId}] Error fetching metrics for flow ${flow.id}:`, error.message);
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
      console.warn(`[${requestId}] Error fetching profiles:`, error.message);
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

    const topFlowsByPerformance = flowMetrics
      .filter(f => f.performance.deliveries > 0)
      .sort((a, b) => b.performance.open_rate - a.performance.open_rate)
      .slice(0, 5);

    // Step 9: Calculate summary metrics
    const totalRevenue = totalCampaignRevenue + totalFlowRevenue;
    const totalOrders = totalCampaignConversions + totalFlowConversions;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgFlowOpenRate = flowsWithActivity > 0 ? totalFlowOpens / totalFlowDeliveries : 0;
    const avgFlowClickRate = flowsWithActivity > 0 ? totalFlowClicks / totalFlowDeliveries : 0;

    // Step 10: Cache result in database
    try {
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

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
          top_campaigns_by_conversions: topCampaignsByConversions,
          top_flows_by_revenue: topFlowsByRevenue,
          top_flows_by_performance: topFlowsByPerformance,
          flows_detailed: flowMetrics,
          flow_performance_averages: {
            avg_open_rate: avgFlowOpenRate,
            avg_click_rate: avgFlowClickRate,
            total_flow_deliveries: totalFlowDeliveries,
            total_flow_opens: totalFlowOpens,
            total_flow_clicks: totalFlowClicks
          }
        }, { 
          onConflict: 'store_id,period_start,period_end' 
        });

      console.log(`[${requestId}] Cached results in database`);
    } catch (error) {
      console.warn(`[${requestId}] Error caching results:`, error.message);
    }

    // Step 11: Build final response
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
        top_flows_by_performance: topFlowsByPerformance,
        leads_total: leadsTotal,
        campaign_count: campaigns.length,
        flow_count: activeFlows.length,
        campaigns_with_revenue: campaignMetrics.length,
        flows_with_revenue: flowsWithRevenue,
        flows_with_activity: flowsWithActivity,
        flow_performance_averages: {
          avg_open_rate: avgFlowOpenRate,
          avg_click_rate: avgFlowClickRate,
          total_flow_deliveries: totalFlowDeliveries,
          total_flow_opens: totalFlowOpens,
          total_flow_clicks: totalFlowClicks
        },
        flows_detailed: flowMetrics
      },
      period: { start: from, end: to },
      store: { id: storeId, domain: klaviyoSiteId || "" },
      metadata: { 
        metric_id: metricId, 
        request_id: requestId, 
        timestamp: new Date().toISOString(), 
        version: "2.0" 
      },
      status: totalRevenue > 0 || totalOrders > 0 ? "SUCCESS" : "NO_DATA",
      summary: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        average_order_value: avgOrderValue,
        campaign_performance: { 
          sent: campaignsInPeriod.length, 
          with_revenue: campaignMetrics.length, 
          revenue_percentage: campaignsInPeriod.length > 0 ? campaignMetrics.length / campaignsInPeriod.length : 0 
        },
        flow_performance: { 
          active: activeFlows.length, 
          with_revenue: flowsWithRevenue, 
          with_activity: flowsWithActivity, 
          revenue_percentage: activeFlows.length > 0 ? flowsWithRevenue / activeFlows.length : 0, 
          avg_open_rate: avgFlowOpenRate, 
          avg_click_rate: avgFlowClickRate 
        }
      },
      debug: {
        campaigns_found: campaigns.length,
        flows_found: activeFlows.length,
        flows_with_revenue: flowsWithRevenue,
        flows_with_performance: flowsWithActivity,
        metric_id_used: metricId,
        dates_processed: { start: from, end: to }
      }
    };

    console.log(`[${requestId}] Klaviyo Summary completed successfully`);
    console.log(`[${requestId}] Results: ${totalRevenue} revenue, ${totalOrders} orders, ${leadsTotal} leads`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in klaviyo_summary function:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});