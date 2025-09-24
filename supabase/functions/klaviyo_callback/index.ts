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

    // Validate n8n signature or API key
    const signature = req.headers.get('x-n8n-signature')
    const apiKey = req.headers.get('x-api-key')
    const expectedApiKey = Deno.env.get('N8N_API_KEY')
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      console.error('Invalid API key')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Extract data from payload (expecting array with single item)
    if (!Array.isArray(payload) || payload.length === 0) {
      console.error('Invalid payload structure:', payload)
      return new Response('Invalid payload structure', { status: 400, headers: corsHeaders })
    }

    const data = payload[0]
    const { klaviyo, period, store, metadata, status, summary } = data

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
        leads_total: klaviyo.leads_total || "0",
        campaign_count: klaviyo.campaign_count || 0,
        flow_count: klaviyo.flow_count || 0,
        campaigns_with_revenue: klaviyo.campaigns_with_revenue || 0,
        flows_with_revenue: klaviyo.flows_with_revenue || 0,
        flows_with_activity: klaviyo.flows_with_activity || 0,
        flow_perf: klaviyo.flow_performance_averages || null,
        raw: klaviyo,
        updated_at: new Date().toISOString()
      }

      // Upsert klaviyo_summaries
      const { error: summaryError } = await supabase
        .from('klaviyo_summaries')
        .upsert(summaryData, {
          onConflict: 'store_id,period_start,period_end',
          ignoreDuplicates: false
        })

      if (summaryError) {
        console.error('Error upserting klaviyo_summaries:', summaryError)
        // Don't fail the callback, but log the error
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

        await supabase
          .from('channel_revenue')
          .upsert(channelRevenueData, {
            onConflict: 'store_id,period_start,period_end,channel,source',
            ignoreDuplicates: false
          })
      }
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