// ============================================================================
// ADMIN: DETECT KLAVIYO METRICS
// Automatically discovers the "Placed Order" metric ID for all stores
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KlaviyoMetric {
  id: string
  type: 'metric'
  attributes: {
    name: string
    integration?: {
      name: string
      category: string
    }
  }
}

/**
 * Search for "Placed Order" metric in Klaviyo
 * This is the metric used for revenue attribution
 */
async function detectPlacedOrderMetric(klaviyoApiKey: string): Promise<string | null> {
  const url = 'https://a.klaviyo.com/api/metrics/'
  const headers = {
    'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
    'revision': '2024-10-15',
    'Accept': 'application/json'
  }

  try {
    const response = await fetch(url, { headers })

    if (!response.ok) {
      console.error(`[Klaviyo] API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    const metrics: KlaviyoMetric[] = data.data || []

    // Strategy 1: Find by exact name "Placed Order"
    let placedOrderMetric = metrics.find(m =>
      m.attributes.name === 'Placed Order'
    )

    // Strategy 2: Find by integration
    if (!placedOrderMetric) {
      placedOrderMetric = metrics.find(m =>
        m.attributes.integration?.category === 'Shopify' &&
        m.attributes.name.toLowerCase().includes('order')
      )
    }

    // Strategy 3: Find by name containing "order"
    if (!placedOrderMetric) {
      placedOrderMetric = metrics.find(m =>
        m.attributes.name.toLowerCase() === 'placed order' ||
        m.attributes.name.toLowerCase() === 'ordered product'
      )
    }

    if (placedOrderMetric) {
      console.log(`[Klaviyo] Found metric: ${placedOrderMetric.attributes.name} (${placedOrderMetric.id})`)
      return placedOrderMetric.id
    }

    console.warn('[Klaviyo] No "Placed Order" metric found')
    return null

  } catch (error: any) {
    console.error(`[Klaviyo] Error detecting metric: ${error.message}`)
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // ========================================================================
    // 1. AUTHENTICATION (Service role only)
    // ========================================================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.includes('service_role')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Service role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ========================================================================
    // 2. GET PARAMETERS
    // ========================================================================
    const body = await req.json().catch(() => ({}))
    const { store_id, force_refresh } = body

    console.log('='.repeat(80))
    console.log('[Detect Metrics] Starting detection...')
    if (store_id) {
      console.log('[Detect Metrics] Mode: Single store')
      console.log('[Detect Metrics] Store ID:', store_id)
    } else {
      console.log('[Detect Metrics] Mode: All stores')
    }
    console.log('[Detect Metrics] Force refresh:', force_refresh || false)
    console.log('='.repeat(80))

    // ========================================================================
    // 3. FETCH STORES TO PROCESS
    // ========================================================================
    let query = supabase
      .from('stores')
      .select('id, name, klaviyo_private_key, klaviyo_metric_id')
      .not('klaviyo_private_key', 'is', null)

    // If store_id specified, only process that store
    if (store_id) {
      query = query.eq('id', store_id)
    }

    // If not force_refresh, only process stores without metric_id
    if (!force_refresh) {
      query = query.is('klaviyo_metric_id', null)
    }

    const { data: stores, error: storesError } = await query

    if (storesError) {
      throw new Error(`Failed to fetch stores: ${storesError.message}`)
    }

    if (!stores || stores.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No stores to process',
          processed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Detect Metrics] Processing ${stores.length} stores...`)

    // ========================================================================
    // 4. DETECT METRICS FOR EACH STORE
    // ========================================================================
    const results = []

    for (const store of stores) {
      console.log(`\n[Store: ${store.name}] Detecting metric...`)

      try {
        const metricId = await detectPlacedOrderMetric(store.klaviyo_private_key)

        if (metricId) {
          // Update store with detected metric
          const { error: updateError } = await supabase
            .from('stores')
            .update({ klaviyo_metric_id: metricId })
            .eq('id', store.id)

          if (updateError) {
            console.error(`[Store: ${store.name}] Failed to update: ${updateError.message}`)
            results.push({
              store_id: store.id,
              store_name: store.name,
              status: 'error',
              error: updateError.message
            })
          } else {
            console.log(`[Store: ${store.name}] ✅ Metric detected and saved: ${metricId}`)
            results.push({
              store_id: store.id,
              store_name: store.name,
              status: 'success',
              metric_id: metricId
            })
          }
        } else {
          console.warn(`[Store: ${store.name}] ⚠️  No metric found`)
          results.push({
            store_id: store.id,
            store_name: store.name,
            status: 'not_found',
            message: 'No "Placed Order" metric found in Klaviyo'
          })
        }

        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error: any) {
        console.error(`[Store: ${store.name}] Error: ${error.message}`)
        results.push({
          store_id: store.id,
          store_name: store.name,
          status: 'error',
          error: error.message
        })
      }
    }

    // ========================================================================
    // 5. RETURN RESULTS
    // ========================================================================
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    const notFoundCount = results.filter(r => r.status === 'not_found').length

    console.log('\n' + '='.repeat(80))
    console.log('[Detect Metrics] Completed')
    console.log(`[Detect Metrics] Success: ${successCount}`)
    console.log(`[Detect Metrics] Not found: ${notFoundCount}`)
    console.log(`[Detect Metrics] Errors: ${errorCount}`)
    console.log('='.repeat(80))

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: stores.length,
          success: successCount,
          not_found: notFoundCount,
          errors: errorCount
        },
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('[Detect Metrics] Fatal error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
