import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if we're in the quiet hours (3-6 AM BRT)
    const now = new Date()
    const brtTime = new Date(now.getTime() - (3 * 60 * 60 * 1000)) // UTC-3 for BRT
    const hour = brtTime.getHours()
    
    if (hour >= 3 && hour < 6) {
      console.log('Skipping sync during quiet hours (3-6 AM BRT)')
      return new Response(JSON.stringify({ 
        message: 'Sync skipped during quiet hours',
        hour: hour 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get all active stores with Klaviyo credentials
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, shopify_domain, shopify_access_token, klaviyo_private_key, klaviyo_site_id, country, currency, status')
      .eq('status', 'connected')
      .not('klaviyo_private_key', 'is', null)
      .not('klaviyo_site_id', 'is', null)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return new Response('Error fetching stores', { status: 500, headers: corsHeaders })
    }

    if (!stores || stores.length === 0) {
      console.log('No active stores with Klaviyo credentials found')
      return new Response(JSON.stringify({ 
        message: 'No stores to sync',
        count: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${stores.length} stores to sync`)

    // Calculate periods (30 days, 14 days, 7 days)
    const periods = [
      { days: 30, label: '30_days' },
      { days: 14, label: '14_days' },
      { days: 7, label: '7_days' }
    ]

    const results = []
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')

    if (!n8nWebhookUrl) {
      return new Response('N8N webhook not configured', { status: 500, headers: corsHeaders })
    }

    // Process each store and each period
    for (const store of stores) {
      const storeResults = []
      
      for (const period of periods) {
        try {
          // Calculate dates for this period
          const endDate = new Date()
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - period.days)
          
          const periodStart = startDate.toISOString().split('T')[0]
          const periodEnd = endDate.toISOString().split('T')[0]

          // Check if there's already a job running for this store and period
          const { data: existingJob } = await supabase
            .from('n8n_jobs')
            .select('*')
            .eq('store_id', store.id)
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd)
            .in('status', ['QUEUED', 'PROCESSING'])
            .maybeSingle()

          if (existingJob) {
            console.log(`Skipping store ${store.name} for ${period.label} - job already in progress`)
            storeResults.push({
              period: period.label,
              status: 'skipped',
              reason: 'job_in_progress'
            })
            continue
          }

          // Clean up old stuck jobs (older than 30 minutes)
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
          await supabase
            .from('n8n_jobs')
            .update({ 
              status: 'ERROR', 
              error: 'Job stuck - cleaned up by auto sync',
              finished_at: new Date().toISOString()
            })
            .eq('store_id', store.id)
            .in('status', ['QUEUED', 'PROCESSING'])
            .lt('created_at', thirtyMinutesAgo.toISOString())

          // Generate request ID
          const request_id = `auto_${period.label}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

          // Create job record
          const { data: job, error: jobError } = await supabase
            .from('n8n_jobs')
            .insert({
              store_id: store.id,
              period_start: periodStart,
              period_end: periodEnd,
              request_id,
              status: 'QUEUED',
              source: 'auto_sync',
              created_by: '00000000-0000-0000-0000-000000000000', // system user
              meta: {
                auto_sync_triggered_at: new Date().toISOString(),
                store_name: store.name,
                shopify_domain: store.shopify_domain,
                period_label: period.label,
                period_days: period.days
              }
            })
            .select()
            .single()

          if (jobError) {
            console.error(`Error creating job for store ${store.name} (${period.label}):`, jobError)
            storeResults.push({
              period: period.label,
              status: 'error',
              error: 'failed_to_create_job'
            })
            continue
          }

          // Prepare n8n webhook payload with complete store data
          const n8nPayload = {
            // Job information
            storeId: store.id,
            from: periodStart + 'T00:00:00.000Z',
            to: periodEnd + 'T23:59:59.000Z',
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

          // Trigger n8n webhook
          const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(n8nPayload)
          })

          if (n8nResponse.ok) {
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

            storeResults.push({
              period: period.label,
              status: 'started',
              job_id: job.id,
              request_id: request_id
            })

            console.log(`Started sync for store ${store.name} (${period.label})`)
          } else {
            // Update job status to error
            await supabase
              .from('n8n_jobs')
              .update({ 
                status: 'ERROR', 
                error: `N8N webhook failed: ${n8nResponse.status} ${n8nResponse.statusText}`,
                finished_at: new Date().toISOString()
              })
              .eq('id', job.id)

            storeResults.push({
              period: period.label,
              status: 'error',
              error: 'n8n_webhook_failed'
            })

            console.error(`Failed to trigger n8n for store ${store.name} (${period.label}): ${n8nResponse.status}`)
          }

          // Small delay between requests to avoid overwhelming n8n
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay

        } catch (error) {
          console.error(`Error processing store ${store.name} for ${period.label}:`, error)
          storeResults.push({
            period: period.label,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      results.push({
        store_id: store.id,
        store_name: store.name,
        periods: storeResults
      })
      
      // Add delay between stores
      if (stores.indexOf(store) < stores.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay between stores
      }
    }

    // Calculate summary
    const summary = {
      total_stores: stores.length,
      total_periods: periods.length,
      total_jobs: stores.length * periods.length,
      started: results.reduce((acc, r) => acc + r.periods.filter(p => p.status === 'started').length, 0),
      skipped: results.reduce((acc, r) => acc + r.periods.filter(p => p.status === 'skipped').length, 0),
      errors: results.reduce((acc, r) => acc + r.periods.filter(p => p.status === 'error').length, 0),
      details: results
    }

    console.log('Auto sync summary:', summary)

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in auto_sync_klaviyo:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})