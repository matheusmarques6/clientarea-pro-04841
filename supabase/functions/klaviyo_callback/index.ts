import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-signature, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role for webhook
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.text()
    let payload

    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error('Invalid JSON payload:', error)
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }

    // Log the webhook call for debugging
    console.log('Klaviyo callback received:', { 
      headers: Object.fromEntries(req.headers.entries()),
      payloadLength: body.length 
    })

    // Extract data from payload (expecting array with single item)
    if (!Array.isArray(payload) || payload.length === 0) {
      console.error('Invalid payload structure:', payload)
      return new Response('Invalid payload structure', { status: 400, headers: corsHeaders })
    }

    const data = payload[0]
    const { klaviyo, period, store, metadata, status, summary } = data

    // Log the full data for debugging
    console.log('Processing Klaviyo callback data:', JSON.stringify(data, null, 2))

    if (!metadata?.request_id) {
      console.error('Missing request_id in metadata')
      return new Response('Missing request_id', { status: 400, headers: corsHeaders })
    }

    // Find the job by request_id
    const { data: job, error: jobError } = await supabase
      .from('n8n_jobs')
      .select('*')
      .eq('request_id', metadata.request_id)
      .single()

    if (jobError || !job) {
      console.error('Job not found for request_id:', metadata.request_id, jobError)
      return new Response('Job not found', { status: 404, headers: corsHeaders })
    }

    // Update job status
    const jobUpdate = {
      status: status === 'SUCCESS' ? 'SUCCESS' : 'ERROR',
      finished_at: new Date().toISOString(),
      payload: data,
      ...(status !== 'SUCCESS' && { error: `Workflow failed with status: ${status}` })
    }

    const { error: updateError } = await supabase
      .from('n8n_jobs')
      .update(jobUpdate)
      .eq('id', job.id)

    if (updateError) {
      console.error('Error updating job:', updateError)
      return new Response('Failed to update job', { status: 500, headers: corsHeaders })
    }

    // If successful, update klaviyo_summaries
    if (status === 'SUCCESS' && klaviyo) {
      console.log('Processing Klaviyo data for store:', store?.id || job.store_id)
      
      // Parse leads_total (it comes as string "1+", need to convert to number)
      let leadsTotal = 0
      if (klaviyo.leads_total) {
        const leadsStr = klaviyo.leads_total.toString()
        if (leadsStr.includes('+')) {
          leadsTotal = parseInt(leadsStr.replace('+', '')) || 0
        } else {
          leadsTotal = parseInt(leadsStr) || 0
        }
      }

      const summaryData = {
        store_id: store?.id || job.store_id,
        period_start: period?.start || job.period_start,
        period_end: period?.end || job.period_end,
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
        raw: data,
        updated_at: new Date().toISOString()
      }

      console.log('Saving klaviyo_summaries data:', JSON.stringify(summaryData, null, 2))

      // Upsert klaviyo_summaries
      const { data: summaryResult, error: summaryError } = await supabase
        .from('klaviyo_summaries')
        .upsert(summaryData, {
          onConflict: 'store_id,period_start,period_end',
          ignoreDuplicates: false
        })
        .select()

      if (summaryError) {
        console.error('Error upserting klaviyo_summaries:', summaryError)
        // Don't fail the callback, but log the error
      } else {
        console.log('Successfully saved klaviyo_summaries:', summaryResult)
      }

      // Also save to channel_revenue for dashboard compatibility
      if (klaviyo.revenue_total > 0) {
        const channelRevenueData = {
          store_id: store?.id || job.store_id,
          period_start: period?.start || job.period_start,
          period_end: period?.end || job.period_end,
          channel: 'email',
          source: 'klaviyo_webhook',
          revenue: klaviyo.revenue_total,
          orders_count: klaviyo.orders_attributed,
          currency: 'BRL', // Default, could be extracted from store data
          raw: data,
          updated_at: new Date().toISOString()
        }

        console.log('Saving channel_revenue data:', JSON.stringify(channelRevenueData, null, 2))

        const { data: channelResult, error: channelError } = await supabase
          .from('channel_revenue')
          .upsert(channelRevenueData, {
            onConflict: 'store_id,period_start,period_end,channel,source',
            ignoreDuplicates: false
          })
          .select()

        if (channelError) {
          console.error('Error saving channel_revenue:', channelError)
        } else {
          console.log('Successfully saved channel_revenue:', channelResult)
        }
      }
    }

    // Update job status to SUCCESS after processing data
    console.log('Updating job status to SUCCESS for request_id:', metadata.request_id)
    
    const { error: jobUpdateError } = await supabase
      .from('n8n_jobs')
      .update({ 
        status: 'SUCCESS',
        finished_at: new Date().toISOString(),
        meta: {
          callback_received_at: new Date().toISOString(),
          data_processed: true,
          total_revenue_processed: data[0]?.klaviyo?.revenue_total || 0
        }
      })
      .eq('request_id', metadata.request_id)
    
    if (jobUpdateError) {
      console.error('Error updating job status:', jobUpdateError)
    } else {
      console.log('Job status updated to SUCCESS successfully')
    }

    console.log(`Successfully processed callback for request_id: ${metadata.request_id}, status: ${status}`)

    return new Response('OK', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })

  } catch (error) {
    console.error('Error in klaviyo_callback:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})