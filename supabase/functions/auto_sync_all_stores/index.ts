import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const generateRequestId = () => `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Auto sync started at:', new Date().toISOString())

    // Get all active stores with Klaviyo credentials
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, klaviyo_private_key, klaviyo_site_id, status')
      .eq('status', 'connected')
      .not('klaviyo_private_key', 'is', null)
      .not('klaviyo_site_id', 'is', null)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return new Response('Error fetching stores', { status: 500, headers: corsHeaders })
    }

    if (!stores || stores.length === 0) {
      console.log('No stores found with Klaviyo credentials')
      return new Response(JSON.stringify({ 
        message: 'No stores to sync',
        stores_processed: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${stores.length} stores to sync:`, stores.map(s => s.name))

    // Calculate period (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 30)
    
    const period_start = startDate.toISOString().split('T')[0]
    const period_end = endDate.toISOString().split('T')[0]

    console.log(`Syncing period: ${period_start} to ${period_end}`)

    const results = []

    // Process each store
    for (const store of stores) {
      try {
        console.log(`Processing store: ${store.name} (${store.id})`)

        // Check if there's already a recent sync (within last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        
        const { data: recentJobs } = await supabase
          .from('n8n_jobs')
          .select('id, status, created_at')
          .eq('store_id', store.id)
          .eq('period_start', period_start)
          .eq('period_end', period_end)
          .gte('created_at', oneHourAgo.toISOString())
          .in('status', ['SUCCESS', 'PROCESSING', 'QUEUED'])

        if (recentJobs && recentJobs.length > 0) {
          console.log(`Skipping store ${store.name} - recent sync found:`, recentJobs[0])
          results.push({
            store_id: store.id,
            store_name: store.name,
            status: 'skipped',
            reason: 'recent_sync_exists'
          })
          continue
        }

        // Clean up old stuck jobs for this store
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
        
        const { data: stuckJobs } = await supabase
          .from('n8n_jobs')
          .select('id')
          .eq('store_id', store.id)
          .in('status', ['QUEUED', 'PROCESSING'])
          .lt('started_at', thirtyMinutesAgo.toISOString())

        if (stuckJobs && stuckJobs.length > 0) {
          await supabase
            .from('n8n_jobs')
            .update({ 
              status: 'ERROR', 
              error: 'Auto cleanup - stuck job',
              finished_at: new Date().toISOString()
            })
            .in('id', stuckJobs.map(j => j.id))
          
          console.log(`Cleaned up ${stuckJobs.length} stuck jobs for store ${store.name}`)
        }

        // Call the start_klaviyo_job function for this store
        const syncPayload = {
          store_id: store.id,
          period_start: period_start,
          period_end: period_end
        }

        const { data: jobResult, error: jobError } = await supabase.functions.invoke('start_klaviyo_job', {
          body: syncPayload
        })

        if (jobError) {
          console.error(`Error starting job for store ${store.name}:`, jobError)
          results.push({
            store_id: store.id,
            store_name: store.name,
            status: 'error',
            error: jobError.message
          })
        } else {
          console.log(`Successfully started sync for store ${store.name}:`, jobResult)
          results.push({
            store_id: store.id,
            store_name: store.name,
            status: 'started',
            job_id: jobResult?.job_id,
            request_id: jobResult?.request_id
          })
        }

        // Add small delay between stores to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000))

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

    console.log('Auto sync completed. Results:', results)

    return new Response(JSON.stringify({
      message: 'Auto sync completed',
      timestamp: new Date().toISOString(),
      stores_processed: stores.length,
      results: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in auto_sync_all_stores:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})