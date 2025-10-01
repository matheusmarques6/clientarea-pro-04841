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

    // Check for stuck jobs (older than 10 minutes) and clean them up AGGRESSIVELY
    const twoMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    console.log('Cleaning up ANY jobs older than 10 minutes:', twoMinutesAgo)

    // Force cleanup of ANY stuck jobs for this store and period
    const { data: stuckJobs } = await supabase
      .from('n8n_jobs')
      .select('id, request_id, status, created_at')
      .eq('store_id', store_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .in('status', ['QUEUED', 'PROCESSING'])
      .lt('created_at', twoMinutesAgo)

    if (stuckJobs && stuckJobs.length > 0) {
      console.log('Found stuck jobs for this period, force cleaning ALL:', stuckJobs)
      
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'ERROR', 
          error: 'Job timeout - cleaned for new sync (10min+ old)',
          finished_at: new Date().toISOString()
        })
        .in('id', stuckJobs.map(job => job.id))
      
      console.log('Force cleaned all stuck jobs, proceeding with new job')
    }

    // Also clean up ANY job that's been in PROCESSING for more than 15 minutes (regardless of store)
    const fiveMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: globalStuckJobs } = await supabase
      .from('n8n_jobs')
      .select('id')
      .eq('status', 'PROCESSING')
      .lt('created_at', fiveMinutesAgo)
      .limit(20)

    if (globalStuckJobs && globalStuckJobs.length > 0) {
      console.log('Cleaning up global stuck PROCESSING jobs:', globalStuckJobs.length)
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'ERROR', 
          error: 'Global timeout - auto cleanup (15min+ in PROCESSING)',
          finished_at: new Date().toISOString()
        })
        .in('id', globalStuckJobs.map(job => job.id))
    }

    // Check for VERY recent jobs (last 30 seconds only) to prevent rapid-fire requests
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()
    const { data: veryRecentJobs } = await supabase
      .from('n8n_jobs')
      .select('*')
      .eq('store_id', store_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .in('status', ['QUEUED', 'PROCESSING'])
      .gt('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: false })

    if (veryRecentJobs && veryRecentJobs.length > 0) {
      console.log('Found VERY recent job (< 30 seconds):', veryRecentJobs[0].id, 'status:', veryRecentJobs[0].status)
      console.log('Job created at:', veryRecentJobs[0].created_at)
      
      // Only block if job is REALLY recent (less than 30 seconds)
      return new Response(JSON.stringify({
        job_id: veryRecentJobs[0].id,
        request_id: veryRecentJobs[0].request_id,
        status: veryRecentJobs[0].status,
        store_id: store_id,
        period_start: period_start,
        period_end: period_end,
        message: 'Por favor aguarde 30 segundos antes de sincronizar novamente'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log('No blocking jobs found, proceeding with new sync...')

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

    // Check if Klaviyo credentials are configured
    if (!store.klaviyo_private_key || !store.klaviyo_site_id) {
      console.error('Klaviyo credentials not configured for store:', store_id)
      return new Response(JSON.stringify({
        error: 'Klaviyo credentials not configured',
        message: 'Configure as credenciais do Klaviyo (API key e Site ID) nas configurações da loja'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Store has Klaviyo credentials configured:', {
      hasPrivateKey: !!store.klaviyo_private_key,
      hasSiteId: !!store.klaviyo_site_id,
      shopifyDomain: store.shopify_domain
    })

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
      console.error('CRITICAL ERROR: N8N_WEBHOOK_URL environment variable not configured!')
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'ERROR', 
          error: 'N8N_WEBHOOK_URL not configured - contact admin',
          finished_at: new Date().toISOString()
        })
        .eq('id', job.id)

      return new Response(JSON.stringify({
        error: 'N8N webhook not configured',
        message: 'Entre em contato com o administrador - webhook não configurado'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('N8N_WEBHOOK_URL is configured, proceeding with webhook call')

    try {
      console.log('====== N8N WEBHOOK CALL START ======')
      console.log('Job ID:', job.id)
      console.log('Store ID:', store_id)
      console.log('Period:', `${period_start} to ${period_end}`)
      console.log('N8N Webhook URL:', n8nWebhookUrl)
      console.log('Request ID:', request_id)
      console.log('Payload being sent:', JSON.stringify({
        storeId: store_id,
        storeName: store.name,
        period: `${period_start} to ${period_end}`,
        hasKlaviyoPrivateKey: !!store.klaviyo_private_key,
        hasSiteId: !!store.klaviyo_site_id,
        hasShopifyDomain: !!store.shopify_domain,
        hasShopifyToken: !!store.shopify_access_token,
        klaviyoKeyLength: store.klaviyo_private_key ? store.klaviyo_private_key.length : 0,
        siteIdLength: store.klaviyo_site_id ? store.klaviyo_site_id.length : 0
      }))
      console.log('====== FULL PAYLOAD ======')
      console.log(JSON.stringify(n8nPayload, null, 2))
      console.log('====== END PAYLOAD ======')
      
      const n8nHeaders = {
        'Content-Type': 'application/json'
      }

      // Set timeout to 5 minutes as requested
      const timeoutController = new AbortController()
      const timeoutId = setTimeout(() => timeoutController.abort(), 300000) // 5 minutes timeout

      console.log('Sending request to N8N webhook...')
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: n8nHeaders,
        body: JSON.stringify(n8nPayload),
        signal: timeoutController.signal
      })

      clearTimeout(timeoutId)
      console.log('N8N webhook response received, status:', n8nResponse.status)

      console.log('N8N webhook response status:', n8nResponse.status)

      if (!n8nResponse.ok) {
        const responseText = await n8nResponse.text()
        console.error('N8N webhook error response:', responseText)
        console.error('Response status:', n8nResponse.status)
        console.error('Response headers:', Object.fromEntries(n8nResponse.headers.entries()))
        
        // Update job to ERROR status
        await supabase
          .from('n8n_jobs')
          .update({ 
            status: 'ERROR',
            error: `N8N webhook failed: ${n8nResponse.status} ${n8nResponse.statusText} - ${responseText}`,
            finished_at: new Date().toISOString(),
            meta: {
              ...job.meta,
              webhook_error: {
                status: n8nResponse.status,
                statusText: n8nResponse.statusText,
                response: responseText,
                timestamp: new Date().toISOString()
              }
            }
          })
          .eq('id', job.id)
        
        throw new Error(`N8N webhook failed: ${n8nResponse.status} ${n8nResponse.statusText}`)
      }

      // Get the response data from N8N (should contain Klaviyo data)
      let responseData
      try {
        const responseText = await n8nResponse.text()
        console.log('====== RAW N8N RESPONSE ======')
        console.log('Response length:', responseText.length)
        console.log('First 1000 chars:', responseText.substring(0, 1000))
        console.log('====== END RAW RESPONSE ======')
        
        // Try to parse as JSON
        try {
          responseData = JSON.parse(responseText)
          console.log('Successfully parsed as JSON')
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError)
          console.log('Response was:', responseText)
          responseData = { raw: responseText }
        }
      } catch (textError) {
        console.error('Failed to read response text:', textError)
        responseData = {}
      }
      
      console.log('====== PARSED RESPONSE DATA ======')
      console.log('Response data type:', typeof responseData)
      console.log('Response data keys:', responseData ? Object.keys(responseData) : 'null')
      console.log('Full parsed data:', JSON.stringify(responseData, null, 2))
      console.log('====== END PARSED DATA ======')

      // Update job status to processing with response metadata
      await supabase
        .from('n8n_jobs')
        .update({ 
          status: 'PROCESSING',
          meta: {
            ...job.meta,
            n8n_response_status: n8nResponse.status,
            n8n_triggered_at: new Date().toISOString(),
            n8n_response_received: true,
            payload_sent: {
              store_name: store.name,
              shopify_domain: store.shopify_domain,
              has_klaviyo_credentials: !!(store.klaviyo_private_key && store.klaviyo_site_id)
            }
          }
        })
        .eq('id', job.id)

      // Process the Klaviyo data immediately
      console.log('Processing N8N response data for job:', job.id)
      
      try {
        // Validate response structure
        console.log('Starting to process N8N response data...')
        console.log('responseData is:', responseData)
        console.log('responseData type:', typeof responseData)
        
        if (!responseData || typeof responseData !== 'object') {
          console.error('Invalid response data structure:', responseData)
          throw new Error('Invalid response data structure')
        }

        // Try different paths to find Klaviyo data
        console.log('Looking for Klaviyo data in response...')
        let klaviyoData = null
        
        // Try direct klaviyo property
        if (responseData.klaviyo) {
          console.log('Found data at responseData.klaviyo')
          klaviyoData = responseData.klaviyo
        }
        // Try data.klaviyo
        else if (responseData.data?.klaviyo) {
          console.log('Found data at responseData.data.klaviyo')
          klaviyoData = responseData.data.klaviyo
        }
        // Try if response itself has the klaviyo structure
        else if (responseData.revenue_total !== undefined || responseData.leads_total !== undefined) {
          console.log('Response itself appears to be Klaviyo data')
          klaviyoData = responseData
        }
        // Try first element if it's an array
        else if (Array.isArray(responseData) && responseData[0]) {
          console.log('Response is array, checking first element')
          klaviyoData = responseData[0].klaviyo || responseData[0]
        }
        
        console.log('Extracted Klaviyo data:', JSON.stringify(klaviyoData, null, 2))
        
        if (klaviyoData) {
          console.log('Klaviyo data found, checking values...')
          console.log('revenue_total:', klaviyoData.revenue_total)
          console.log('leads_total:', klaviyoData.leads_total)
          
          // Parse leads_total if it's a string
          let leadsTotal = 0
          if (klaviyoData.leads_total) {
            const leadsTotalStr = String(klaviyoData.leads_total)
            const cleanedLeads = leadsTotalStr.replace(/[^\d]/g, '')
            leadsTotal = parseInt(cleanedLeads) || 0
          }

          // Save data even if values are zero (to track that sync happened)
          console.log('Saving Klaviyo data to database (even if zero values)...')
          
          const summaryData = {
            store_id: store_id,
            period_start: period_start,
            period_end: period_end,
            revenue_total: klaviyoData.revenue_total || 0,
            revenue_campaigns: klaviyoData.revenue_campaigns || 0,
            revenue_flows: klaviyoData.revenue_flows || 0,
            leads_total: leadsTotal,
            orders_attributed: klaviyoData.orders_attributed || 0,
            conversions_campaigns: klaviyoData.conversions_campaigns || 0,
            conversions_flows: klaviyoData.conversions_flows || 0,
            campaigns_with_revenue: klaviyoData.campaigns_with_revenue || 0,
            flows_with_revenue: klaviyoData.flows_with_revenue || 0,
            flows_with_activity: klaviyoData.flows_with_activity || 0,
            campaign_count: klaviyoData.campaign_count || 0,
            flow_count: klaviyoData.flow_count || 0,
            flow_perf: klaviyoData.flow_performance_averages || null,
            top_campaigns_by_revenue: klaviyoData.top_campaigns_by_revenue || [],
            top_campaigns_by_conversions: klaviyoData.top_campaigns_by_conversions || [],
            raw: klaviyoData,  // Store the entire klaviyo object in the raw column
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          console.log('Summary data to save:', JSON.stringify(summaryData, null, 2))

          const { data: savedSummary, error: upsertError } = await supabase
            .from('klaviyo_summaries')
            .upsert(summaryData, {
              onConflict: 'store_id,period_start,period_end'
            })
            .select()
            .single()

          if (upsertError) {
            console.error('Error upserting klaviyo_summaries:', upsertError)
            console.error('Error details:', JSON.stringify(upsertError, null, 2))
          } else {
            console.log('Successfully saved Klaviyo summary:', savedSummary?.id)
          }

          // Also save to channel_revenue for compatibility (even if zero)
          const channelRevenueData = {
            store_id: store_id,
            period_start: period_start,
            period_end: period_end,
            channel: 'email',
            source: 'klaviyo_webhook',
            revenue: klaviyoData.revenue_total || 0,
            orders_count: klaviyoData.orders_count || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          console.log('Channel revenue data to save:', JSON.stringify(channelRevenueData, null, 2))

          const { data: savedChannel, error: channelError } = await supabase
            .from('channel_revenue')
            .upsert(channelRevenueData, {
              onConflict: 'store_id,period_start,period_end,channel'
            })
            .select()
            .single()

          if (channelError) {
            console.error('Error upserting channel_revenue:', channelError)
            console.error('Error details:', JSON.stringify(channelError, null, 2))
          } else {
            console.log('Successfully saved channel revenue:', savedChannel?.id)
          }
        } else {
          console.log('NO Klaviyo data found in response')
          console.log('Available keys in response:', Object.keys(responseData || {}))
          console.log('Full response for debugging:', JSON.stringify(responseData, null, 2))
          
          // Save a record indicating sync happened but no data was returned
          const emptyData = {
            store_id: store_id,
            period_start: period_start,
            period_end: period_end,
            revenue_total: 0,
            revenue_campaigns: 0,
            revenue_flows: 0,
            leads_total: 0,
            leads_campaigns: 0,
            leads_flows: 0,
            klaviyo: { no_data: true, synced_at: new Date().toISOString() },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          console.log('Saving empty sync record...')
          await supabase
            .from('klaviyo_summaries')
            .upsert(emptyData, {
              onConflict: 'store_id,period_start,period_end'
            })
        }

        // Update job status to SUCCESS immediately after processing
        const { error: successUpdateError } = await supabase
          .from('n8n_jobs')
          .update({ 
            status: 'SUCCESS',
            finished_at: new Date().toISOString(),
            meta: {
              ...job.meta,
              processing_completed: true,
              data_saved: true,
              klaviyo_data_processed: true
            }
          })
          .eq('id', job.id)

        if (successUpdateError) {
          console.error('Error updating job to SUCCESS:', successUpdateError)
        } else {
          console.log('Job completed successfully and status updated:', job.id)
        }

        console.log('Job completed successfully:', job.id)

      } catch (processError) {
        console.error('Error processing N8N response:', processError)
        
        // Update job with error but don't fail the request
        await supabase
          .from('n8n_jobs')
          .update({ 
            status: 'ERROR',
            error: `Failed to process N8N response: ${processError instanceof Error ? processError.message : 'Unknown error'}`,
            finished_at: new Date().toISOString()
          })
          .eq('id', job.id)
      }

      console.log('Returning success response to client')
      
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
      // Get store currency from database
      const { data: storeInfo } = await supabase
        .from('stores')
        .select('currency')
        .eq('id', store?.id || job.store_id)
        .single()
      
      const channelRevenueData = {
        store_id: store?.id || job.store_id,
        period_start: period?.start || job.period_start,
        period_end: period?.end || job.period_end,
        channel: 'email',
        source: 'klaviyo_webhook',
        revenue: klaviyo.revenue_total,
        orders_count: klaviyo.orders_attributed,
        currency: storeInfo?.currency || 'USD',
        raw: klaviyoData,
        updated_at: new Date().toISOString()
      }

      console.log('Saving channel_revenue data with revenue:', channelRevenueData.revenue)

      const { data: channelResult, error: channelError } = await supabase
        .from('channel_revenue')
        .upsert(channelRevenueData, {
          onConflict: 'store_id,period_start,period_end,channel',
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