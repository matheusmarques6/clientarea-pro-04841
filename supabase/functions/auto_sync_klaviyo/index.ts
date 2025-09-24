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

    // Calculate period (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    const periodStart = startDate.toISOString().split('T')[0]
    const periodEnd = endDate.toISOString().split('T')[0]

    const results = []
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')

    if (!n8nWebhookUrl) {
      return new Response('N8N webhook not configured', { status: 500, headers: corsHeaders })
    }

    // Process stores in parallel (but with some delay to avoid overwhelming n8n)
    for (const store of stores) {
      try {
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
          console.log(`Skipping store ${store.name} - job already in progress`)
          results.push({
            store_id: store.id,
            store_name: store.name,
            status: 'skipped',
            reason: 'job_in_progress'
          })
          continue
        }

        // Generate request ID
        const request_id = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
              shopify_domain: store.shopify_domain
            }
          })
          .select()
          .single()

        if (jobError) {
          console.error(`Error creating job for store ${store.name}:`, jobError)
          results.push({
            store_id: store.id,
            store_name: store.name,
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

          results.push({
            store_id: store.id,
            store_name: store.name,
            status: 'started',
            job_id: job.id,
            request_id: request_id
          })

          console.log(`Started sync for store ${store.name}`)
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

          results.push({
            store_id: store.id,
            store_name: store.name,
            status: 'error',
            error: 'n8n_webhook_failed'
          })

          console.error(`Failed to trigger n8n for store ${store.name}: ${n8nResponse.status}`)
        }

        // Small delay between requests to avoid overwhelming n8n
        if (stores.indexOf(store) < stores.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        }

      } catch (error) {
        console.error(`Error processing store ${store.name}:`, error)
        results.push({
          store_id: store.id,
          store_name: store.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const summary = {
      total_stores: stores.length,
      started: results.filter(r => r.status === 'started').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
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