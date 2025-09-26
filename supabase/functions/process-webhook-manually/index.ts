import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Sample webhook data
    const webhookData = {
      klaviyo: {
        revenue_total: 12897.44,
        revenue_campaigns: 1374.44,
        revenue_flows: 11523,
        orders_attributed: 151,
        conversions_campaigns: 17,
        conversions_flows: 134,
        leads_total: "1+",
        campaign_count: 4,
        flow_count: 9,
        campaigns_with_revenue: 2,
        flows_with_revenue: 0,
        flows_with_activity: 0,
        flow_performance_averages: {
          avg_open_rate: 0,
          avg_click_rate: 0,
          total_flow_deliveries: 0,
          total_flow_opens: 0,
          total_flow_clicks: 0
        },
        top_campaigns_by_revenue: [
          {
            id: "01K42TAVGA4PKGM57B1T6ZG4VN",
            name: "[02/09] - [10:00] - [TODOS OS LEADS] - [SOFT SELL SETEMBRO] - [INGLÊS]",
            revenue: 977.85999,
            conversions: 12,
            send_time: "2025-09-02T10:00:00+00:00"
          },
          {
            id: "01K4JAQ9MVRGNQPMWD1YX47PVZ",
            name: "[08/09] - [10:00] - [TODOS OS LEADS] - [CREDITO NA LOJA] - [INGLÊS]",
            revenue: 396.58,
            conversions: 5,
            send_time: "2025-09-08T10:00:00+00:00"
          }
        ],
        top_campaigns_by_conversions: []
      },
      period: {
        start: "2025-08-27",
        end: "2025-09-26"
      },
      store: {
        id: "eebbf8b8-0cde-4dc4-9fe9-fc9870af9075",
        domain: ""
      }
    }

    const { klaviyo, period, store } = webhookData

    // Parse leads_total
    let leadsTotal = 0
    if (klaviyo.leads_total) {
      const leadsStr = klaviyo.leads_total.toString()
      if (leadsStr.includes('+')) {
        leadsTotal = parseInt(leadsStr.replace('+', '')) || 0
      } else {
        leadsTotal = parseInt(leadsStr) || 0
      }
    }

    // Prepare summary data
    const summaryData = {
      store_id: store.id,
      period_start: period.start,
      period_end: period.end,
      revenue_total: klaviyo.revenue_total || 0,
      revenue_campaigns: klaviyo.revenue_campaigns || 0,
      revenue_flows: klaviyo.revenue_flows || 0,
      orders_attributed: klaviyo.orders_attributed || 0,
      conversions_campaigns: klaviyo.conversions_campaigns || 0,
      conversions_flows: klaviyo.conversions_flows || 0,
      leads_total: leadsTotal,
      campaign_count: klaviyo.campaign_count || 0,
      flow_count: klaviyo.flow_count || 0,
      campaigns_with_revenue: klaviyo.campaigns_with_revenue || 0,
      flows_with_revenue: klaviyo.flows_with_revenue || 0,
      flows_with_activity: klaviyo.flows_with_activity || 0,
      flow_perf: klaviyo.flow_performance_averages || null,
      top_campaigns_by_revenue: klaviyo.top_campaigns_by_revenue || [],
      top_campaigns_by_conversions: klaviyo.top_campaigns_by_conversions || [],
      raw: webhookData,
      updated_at: new Date().toISOString()
    }

    console.log('Saving klaviyo_summaries:', summaryData)

    // Upsert klaviyo_summaries
    const { data: summaryResult, error: summaryError } = await supabase
      .from('klaviyo_summaries')
      .upsert(summaryData, {
        onConflict: 'store_id,period_start,period_end',
        ignoreDuplicates: false
      })
      .select()

    if (summaryError) {
      console.error('Error saving klaviyo_summaries:', summaryError)
      return new Response(JSON.stringify({ error: summaryError }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Also save to channel_revenue
    const channelRevenueData = {
      store_id: store.id,
      period_start: period.start,
      period_end: period.end,
      channel: 'email',
      source: 'manual_process',
      revenue: klaviyo.revenue_total,
      orders_count: klaviyo.orders_attributed,
      currency: 'BRL',
      raw: webhookData,
      updated_at: new Date().toISOString()
    }

    console.log('Saving channel_revenue:', channelRevenueData)

    const { data: channelResult, error: channelError } = await supabase
      .from('channel_revenue')
      .upsert(channelRevenueData, {
        onConflict: 'store_id,period_start,period_end,channel,source',
        ignoreDuplicates: false
      })
      .select()

    if (channelError) {
      console.error('Error saving channel_revenue:', channelError)
    }

    // Update job status if exists
    const { data: jobs } = await supabase
      .from('n8n_jobs')
      .select('id')
      .eq('store_id', store.id)
      .eq('period_start', period.start)
      .eq('period_end', period.end)
      .eq('status', 'PROCESSING')

    if (jobs && jobs.length > 0) {
      await supabase
        .from('n8n_jobs')
        .update({
          status: 'SUCCESS',
          finished_at: new Date().toISOString(),
          payload: webhookData
        })
        .eq('id', jobs[0].id)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      summary: summaryResult,
      channel: channelResult 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})