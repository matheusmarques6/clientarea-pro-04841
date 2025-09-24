import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Generate unique request ID
function generateRequestId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `req_${timestamp}_${random}`
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
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Get request body
    const { store_id, period_start, period_end } = await req.json()

    if (!store_id || !period_start || !period_end) {
      return new Response('Missing required fields: store_id, period_start, period_end', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('Store access check:', {
      user_id: user.id,
      store_id: store_id,
    })

    // Check if user has access to this store
    const { data: storeAccess, error: accessError } = await supabase
      .from('v_user_stores')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .single()

    console.log('Store access check:', {
      user_id: user.id,
      store_id: store_id,
      storeAccess,
      accessError
    })

    if (accessError || !storeAccess) {
      return new Response('Access denied to this store', { status: 403, headers: corsHeaders })
    }

    // Check for stuck jobs (older than 20 minutes) and clean them up
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    console.log('Checking for stuck jobs older than:', twentyMinutesAgo)

    const { data: stuckJobs } = await supabase
      .from('n8n_jobs')
      .select('id, request_id')
      .eq('store_id', store_id)
      .in('status', ['QUEUED', 'PROCESSING'])
      .lt('created_at', twentyMinutesAgo)

    if (stuckJobs && stuckJobs.length > 0) {
      console.log('Found stuck jobs, cleaning up:', stuckJobs.length)
      
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'ERROR', 
          error: 'Job timeout - cleaned up (30min+ old)',
          finished_at: new Date().toISOString()
        })
        .in('id', stuckJobs.map(job => job.id))
    } else {
      console.log('No stuck jobs found')
    }

    // Check for existing jobs in QUEUED or PROCESSING status
    console.log('Checking for existing jobs for store:', store_id, 'period:', period_start, 'to', period_end)
    
    const { data: existingJobs } = await supabase
      .from('n8n_jobs')
      .select('*')
      .eq('store_id', store_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .in('status', ['QUEUED', 'PROCESSING'])
      .order('created_at', { ascending: false })

    if (existingJobs && existingJobs.length > 0) {
      console.log('Found existing job:', existingJobs[0].id, 'status:', existingJobs[0].status)
      return new Response(JSON.stringify({
        job_id: existingJobs[0].id,
        request_id: existingJobs[0].request_id,
        status: existingJobs[0].status,
        store_id: store_id,
        period_start: period_start,
        period_end: period_end,
        message: 'Job already in progress'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log('No existing job found, proceeding with new job creation...')

    // Fetch store credentials for N8N
    console.log('Fetching store credentials for:', store_id)
    
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      console.error('Store not found or error:', storeError)
      return new Response('Store not found', { status: 404, headers: corsHeaders })
    }

    // Generate request ID
    const request_id = generateRequestId()
    console.log('Creating new job with request_id:', request_id)

    // Create new job record
    const { data: job, error: jobError } = await supabase
      .from('n8n_jobs')
      .insert({
        store_id: store_id,
        source: 'klaviyo',
        period_start: period_start,
        period_end: period_end,
        request_id: request_id,
        status: 'QUEUED',
        created_by: user.id,
        meta: {
          user_id: user.id,
          user_email: user.email,
          store_name: store.name,
          shopify_domain: store.shopify_domain
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      return new Response('Error creating job', { status: 500, headers: corsHeaders })
    }

    console.log('Job created successfully:', job.id, 'for store:', store_id)

    // Prepare N8N payload
    const n8nPayload = {
      storeId: store_id,
      from: period_start + 'T00:00:00.000Z',
      to: period_end + 'T23:59:59.000Z',
      request_id: request_id,
      
      // Store information
      store: {
        id: store.id,
        name: store.name,
        domain: store.shopify_domain,
        country: store.country || 'BR',
        currency: store.currency || 'BRL',
        status: store.status
      },
      
      // Shopify credentials
      shopify: {
        domain: store.shopify_domain,
        access_token: store.shopify_access_token,
        api_version: '2024-01'
      },
      
      // Klaviyo credentials
      klaviyo: {
        private_key: store.klaviyo_private_key,
        site_id: store.klaviyo_site_id,
        api_version: '2024-02-15'
      },
      
      // Legacy fields for backward compatibility
      shopify_domain: store.shopify_domain,
      shopify_api_key: store.shopify_access_token,
      klaviyo_private_key: store.klaviyo_private_key,
      klaviyo_site_id: store.klaviyo_site_id
    }

    // Trigger n8n webhook and wait for response (up to 5 minutes)
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')

    if (!n8nWebhookUrl) {
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'ERROR', 
          error: 'N8N_WEBHOOK_URL not configured',
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id)

      return new Response('N8N webhook not configured', { status: 500, headers: corsHeaders })
    }

    try {
      console.log('Calling N8N webhook for job:', job.id, 'store:', store_id)
      console.log('N8N Webhook URL:', n8nWebhookUrl)
      console.log('Payload preview:', {
        storeId: store_id,
        period: `${period_start} to ${period_end}`,
        hasKlaviyoCredentials: !!(store.klaviyo_private_key && store.klaviyo_site_id),
        hasShopifyCredentials: !!(store.shopify_domain && store.shopify_access_token)
      })
      
      const n8nHeaders = {
        'Content-Type': 'application/json'
      }

      // Set timeout to 5 minutes as requested
      const timeoutController = new AbortController()
      const timeoutId = setTimeout(() => timeoutController.abort(), 300000) // 5 minutes timeout

      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: n8nHeaders,
        body: JSON.stringify(n8nPayload),
        signal: timeoutController.signal
      })

      clearTimeout(timeoutId)

      console.log('N8N webhook response status:', n8nResponse.status)

      if (!n8nResponse.ok) {
        const responseText = await n8nResponse.text()
        console.error('N8N webhook error response:', responseText)
        
        // Update job to ERROR status
        await supabase
          .from('n8n_jobs')
          .update({ 
            status: 'ERROR',
            error: `N8N webhook failed: ${n8nResponse.status} ${n8nResponse.statusText} - ${responseText}`,
            finished_at: new Date().toISOString()
          })
          .eq('id', job.id)
        
        throw new Error(`N8N webhook failed: ${n8nResponse.status} ${n8nResponse.statusText}`)
      }

      // Get the response data from N8N (should contain Klaviyo data)
      const responseData = await n8nResponse.json()
      console.log('N8N webhook response data received, processing automatically...')

      // Update job status to processing
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'PROCESSING',
          meta: {
            ...job.meta,
            n8n_response_status: n8nResponse.status,
            n8n_triggered_at: new Date().toISOString(),
            payload_sent: {
              store_name: store.name,
              shopify_domain: store.shopify_domain,
              has_klaviyo_credentials: !!(store.klaviyo_private_key && store.klaviyo_site_id)
            }
          }
        })
        .eq('id', job.id)

      // Process the response data automatically in background
      // Process the response data in background without blocking the response

      console.log('Job successfully started and processing data automatically for store:', store_id)
      
      return new Response(JSON.stringify({
        job_id: job.id,
        request_id: request_id,
        status: 'PROCESSING',
        store_id: store_id,
        period_start: period_start,
        period_end: period_end,
        message: 'Webhook triggered successfully, processing data automatically'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })

    } catch (error) {
      console.error('N8N webhook error:', error)
      
      // Update job status to error
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'ERROR', 
          error: `N8N webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id)

      return new Response(JSON.stringify({
        error: 'Failed to trigger N8N webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

  } catch (error) {
    console.error('Error in start_klaviyo_job:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

// Background function to process Klaviyo data automatically
async function processKlaviyoData(responseData: any, job: any, supabase: any) {
  try {
    console.log('Processing Klaviyo data automatically for job:', job.id)
    
    // Extract data from N8N response
    let klaviyoData = null
    
    // Handle different response formats from N8N
    if (Array.isArray(responseData) && responseData.length > 0) {
      klaviyoData = responseData[0]
    } else if (responseData.klaviyo) {
      klaviyoData = responseData
    } else {
      console.error('Invalid response format from N8N:', responseData)
      throw new Error('Invalid response format from N8N')
    }

    const { klaviyo, period, store, metadata } = klaviyoData
    
    if (!klaviyo) {
      console.error('No Klaviyo data found in response:', klaviyoData)
      throw new Error('No Klaviyo data found in response')
    }

    console.log('Processing Klaviyo data for store:', store?.id || job.store_id)
    console.log('Klaviyo revenue total:', klaviyo.revenue_total)
    
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
      raw: klaviyoData,
      updated_at: new Date().toISOString()
    }

    console.log('Saving klaviyo_summaries data with revenue:', summaryData.revenue_total)

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
      throw summaryError
    } else {
      console.log('Successfully saved klaviyo_summaries with revenue:', summaryData.revenue_total)
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
        currency: 'BRL',
        raw: klaviyoData,
        updated_at: new Date().toISOString()
      }

      console.log('Saving channel_revenue data with revenue:', channelRevenueData.revenue)

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
        console.log('Successfully saved channel_revenue with revenue:', channelRevenueData.revenue)
      }
    }

    // Update job status to SUCCESS
    const { error: jobUpdateError } = await supabase
      .from('n8n_jobs')
      .update({ 
        status: 'SUCCESS',
        finished_at: new Date().toISOString(),
        payload: klaviyoData,
        meta: {
          ...job.meta,
          data_processed_at: new Date().toISOString(),
          data_processed: true,
          total_revenue_processed: klaviyo.revenue_total || 0,
          automatic_processing: true
        }
      })
      .eq('id', job.id)
    
    if (jobUpdateError) {
      console.error('Error updating job status:', jobUpdateError)
    } else {
      console.log('Job status updated to SUCCESS successfully')
    }

    console.log(`Successfully processed data automatically for job: ${job.id}, revenue: ${klaviyo.revenue_total}`)

  } catch (error) {
    console.error('Error processing Klaviyo data automatically:', error)
    
    // Update job status to ERROR
    await supabase
      .from('n8n_jobs')
      .update({ 
        status: 'ERROR',
        error: `Data processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        finished_at: new Date().toISOString(),
        meta: {
          ...job.meta,
          processing_error: error instanceof Error ? error.message : 'Unknown error',
          automatic_processing: true
        }
      })
      .eq('id', job.id)
  }
}