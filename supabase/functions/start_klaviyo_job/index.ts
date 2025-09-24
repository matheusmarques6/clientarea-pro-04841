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
    const { data: storeAccess, error: accessError } = await supabase
      .from('v_user_stores')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .maybeSingle()

    console.log('Store access check:', { 
      user_id: user.id, 
      store_id, 
      storeAccess, 
      accessError 
    })

    if (accessError || !storeAccess) {
      console.error('Store access error:', accessError)
      return new Response('Access denied to store', { status: 403, headers: corsHeaders })
    }

    // Clean up stuck jobs older than 20 minutes before checking for existing jobs
    const currentTime = new Date()
    const twentyMinutesAgo = new Date(currentTime.getTime() - 20 * 60 * 1000)
    
    const { data: stuckJobs } = await supabase
      .from('n8n_jobs')
      .select('id, status, started_at, request_id')
      .eq('store_id', store_id)
      .in('status', ['QUEUED', 'PROCESSING'])
      .lt('started_at', twentyMinutesAgo.toISOString())

    if (stuckJobs && stuckJobs.length > 0) {
      console.log('Found and cleaning up stuck jobs older than 20min:', stuckJobs.length)
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'ERROR', 
          error: 'Job timeout - auto cleaned before new sync',
          finished_at: new Date().toISOString()
        })
        .in('id', stuckJobs.map(job => job.id))
      
      console.log('Cleaned up stuck jobs:', stuckJobs.map(j => j.request_id))
    }

    // Check for existing processing job for this specific store and period
    const { data: existingJob, error: jobCheckError } = await supabase
      .from('n8n_jobs')
      .select('*')
      .eq('store_id', store_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .in('status', ['QUEUED', 'PROCESSING'])
      .maybeSingle()

    console.log('Existing job check:', { 
      existingJob, 
      jobCheckError,
      store_id,
      period_start,
      period_end
    })

    if (existingJob) {
      console.log('Job already exists for this store and period:', existingJob)
      return new Response(JSON.stringify({
        job_id: existingJob.id,
        request_id: existingJob.request_id,
        status: existingJob.status,
        message: `Job already in progress for store ${store_id} (${period_start} to ${period_end})`,
        store_id: store_id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('No existing job found, proceeding with new job creation...')

    // Get store credentials and details
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, shopify_domain, shopify_access_token, klaviyo_private_key, klaviyo_site_id, country, currency, status')
      .eq('id', store_id)
      .single()

    if (storeError) {
      console.error('Error fetching store:', storeError)
      return new Response('Store not found', { status: 404, headers: corsHeaders })
    }

    if (!store?.klaviyo_private_key || !store?.klaviyo_site_id) {
      return new Response('Klaviyo credentials not configured', { status: 400, headers: corsHeaders })
    }

    // Note: Shopify credentials are optional for Klaviyo-only sync

    // Generate request ID
    const request_id = generateRequestId()

    console.log('Creating new job with request_id:', request_id)

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
          n8n_webhook_triggered_at: new Date().toISOString(),
          store_name: store.name,
          shopify_domain: store.shopify_domain,
          user_id: user.id,
          user_email: user.email
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      return new Response('Failed to create job', { status: 500, headers: corsHeaders })
    }

    console.log('Job created successfully:', job.id, 'for store:', store_id)

    // Prepare n8n webhook payload with complete store data
    const n8nPayload = {
      // Job information
      storeId: store_id,
      from: period_start + 'T00:00:00.000Z',
      to: period_end + 'T23:59:59.000Z',
      request_id: request_id,
      callback_url: `${supabaseUrl}/functions/v1/klaviyo_callback`,
      
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
        api_version: '2024-01' // Versão da API do Shopify
      },
      
      // Klaviyo credentials
      klaviyo: {
        private_key: store.klaviyo_private_key,
        site_id: store.klaviyo_site_id,
        api_version: '2024-02-15' // Versão da API do Klaviyo
      },
      
      // Legacy fields for backward compatibility
      shopify_domain: store.shopify_domain,
      shopify_api_key: store.shopify_access_token,
      klaviyo_private_key: store.klaviyo_private_key,
      klaviyo_site_id: store.klaviyo_site_id
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

      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: n8nHeaders,
        body: JSON.stringify(n8nPayload)
      })

      console.log('N8N webhook response status:', n8nResponse.status)
      console.log('N8N webhook response headers:', Object.fromEntries(n8nResponse.headers.entries()))

      if (!n8nResponse.ok) {
        const responseText = await n8nResponse.text()
        console.error('N8N webhook error response:', responseText)
        throw new Error(`N8N webhook failed: ${n8nResponse.status} ${n8nResponse.statusText} - ${responseText}`)
      }

      console.log('N8N webhook called successfully for job:', job.id)

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

      console.log('Job successfully started and webhook triggered for store:', store_id)
      
      return new Response(JSON.stringify({
        job_id: job.id,
        request_id: request_id,
        status: 'PROCESSING',
        store_id: store_id,
        period_start: period_start,
        period_end: period_end,
        message: 'Webhook triggered successfully'
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