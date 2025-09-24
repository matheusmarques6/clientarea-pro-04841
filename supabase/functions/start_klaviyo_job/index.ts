import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false 
      },
      global: {
        headers: { 
          Authorization: req.headers.get('Authorization')! 
        }
      }
    })

    // Get the user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { store_id, period_start, period_end } = await req.json()

    if (!store_id || !period_start || !period_end) {
      return new Response('Missing required fields: store_id, period_start, period_end', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Validate user has access to store
    const { data: storeAccess } = await supabase
      .from('v_user_stores')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .single()

    if (!storeAccess) {
      return new Response('Access denied to store', { status: 403, headers: corsHeaders })
    }

    // Check for existing processing job
    const { data: existingJob } = await supabase
      .from('n8n_jobs')
      .select('*')
      .eq('store_id', store_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .in('status', ['QUEUED', 'PROCESSING'])
      .maybeSingle()

    if (existingJob) {
      return new Response(JSON.stringify({
        job_id: existingJob.id,
        request_id: existingJob.request_id,
        status: existingJob.status,
        message: 'Job already in progress'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get store credentials
    const { data: store } = await supabase
      .from('stores')
      .select('shopify_domain, shopify_access_token, klaviyo_private_key, klaviyo_site_id')
      .eq('id', store_id)
      .single()

    if (!store?.shopify_domain || !store?.shopify_access_token || !store?.klaviyo_private_key || !store?.klaviyo_site_id) {
      return new Response('Store credentials not configured', { status: 400, headers: corsHeaders })
    }

    // Generate request ID
    const request_id = generateRequestId()

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('n8n_jobs')
      .insert({
        store_id,
        period_start,
        period_end,
        request_id,
        status: 'QUEUED',
        source: 'klaviyo',
        created_by: user.id,
        meta: {
          n8n_webhook_triggered_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      return new Response('Failed to create job', { status: 500, headers: corsHeaders })
    }

    // Prepare n8n webhook payload
    const n8nPayload = {
      storeId: store_id,
      from: period_start + 'T00:00:00.000Z',
      to: period_end + 'T23:59:59.000Z',
      shopify_domain: store.shopify_domain,
      shopify_api_key: store.shopify_access_token,
      klaviyo_private_key: store.klaviyo_private_key,
      klaviyo_site_id: store.klaviyo_site_id,
      request_id: request_id,
      callback_url: `${supabaseUrl}/functions/v1/klaviyo_callback`
    }

    // Trigger n8n webhook
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')

    if (!n8nWebhookUrl) {
      // Update job status to error
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
      const n8nHeaders = {
        'Content-Type': 'application/json'
      }

      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: n8nHeaders,
        body: JSON.stringify(n8nPayload)
      })

      if (!n8nResponse.ok) {
        throw new Error(`N8N webhook failed: ${n8nResponse.status} ${n8nResponse.statusText}`)
      }

      // Update job status to processing
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'PROCESSING',
          meta: {
            ...job.meta,
            n8n_response_status: n8nResponse.status,
            n8n_triggered_at: new Date().toISOString()
          }
        })
        .eq('id', job.id)

      return new Response(JSON.stringify({
        job_id: job.id,
        request_id: request_id,
        status: 'PROCESSING'
      }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Error calling n8n webhook:', error)
      
      // Update job status to error
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'ERROR', 
          error: error.message,
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id)

      return new Response('Failed to trigger n8n webhook', { status: 500, headers: corsHeaders })
    }

  } catch (error) {
    console.error('Error in start_klaviyo_job:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})