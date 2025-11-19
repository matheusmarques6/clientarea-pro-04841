// ============================================================================
// SYNC STORE - Edge Function Completa
// Executa sincronização Klaviyo + Shopify de forma síncrona (sem N8N)
// Timeout máximo: 150 segundos (limite Supabase)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchKlaviyoData } from '../_shared/klaviyo.ts'
import { fetchShopifyData } from '../_shared/shopify.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function generateRequestId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `req_${timestamp}_${random}`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // ========================================================================
    // 1. AUTENTICAÇÃO E VALIDAÇÃO
    // ========================================================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obter parâmetros
    const { store_id, period_start, period_end, data_type } = await req.json()

    if (!store_id || !period_start || !period_end) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: store_id, period_start, period_end' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar data_type se especificado
    const validDataTypes = ['analytics', 'campaigns', 'flows', 'orders']
    if (data_type && !validDataTypes.includes(data_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid data_type. Must be one of: ${validDataTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isMicroJob = !!data_type
    const syncMode = isMicroJob ? `MICRO-JOB (${data_type})` : 'FULL SYNC'

    console.log('='.repeat(80))
    console.log('[SYNC] Starting sync process')
    console.log('[SYNC] Mode:', syncMode)
    console.log('[SYNC] Store ID:', store_id)
    console.log('[SYNC] Period:', period_start, 'to', period_end)
    console.log('[SYNC] Invoked by: worker (internal)')
    console.log('='.repeat(80))

    // Usar null para user (sempre invocado pelo worker)
    const user = null

    // ========================================================================
    // 2. BUSCAR CREDENCIAIS DA LOJA
    // ========================================================================
    console.log('[Store] Fetching store credentials...')

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      console.error('[Store] Not found:', storeError)
      return new Response('Store not found', { status: 404, headers: corsHeaders })
    }

    // Validar credenciais Klaviyo
    if (!store.klaviyo_private_key) {
      return new Response(
        JSON.stringify({
          error: 'Klaviyo credentials not configured',
          message: 'Configure as credenciais do Klaviyo nas configurações da loja'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const hasShopify = !!(store.shopify_domain && store.shopify_access_token)
    console.log('[Store] Credentials check:')
    console.log('  - Klaviyo: ✓')
    console.log('  - Shopify:', hasShopify ? '✓' : '✗ (optional)')

    // ========================================================================
    // 3. CRIAR JOB RECORD
    // ========================================================================
    const request_id = generateRequestId()
    console.log('[Job] Creating job with request_id:', request_id)

    const { data: job, error: jobError } = await supabase
      .from('n8n_jobs')
      .insert({
        store_id: store_id,
        source: 'sync_store_edge_function',
        period_start: period_start,
        period_end: period_end,
        request_id: request_id,
        status: 'PROCESSING',
        created_by: user ? user.id : null,
        meta: {
          user_id: user ? user.id : null,
          user_email: user ? user.email : 'worker',
          store_name: store.name,
          sync_version: '2.0',
          has_shopify: hasShopify,
          invoked_by: user ? 'user' : 'worker'
        }
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('[Job] Error creating job:', jobError)
      return new Response('Error creating job', { status: 500, headers: corsHeaders })
    }

    console.log('[Job] Created successfully:', job.id)

    // ========================================================================
    // 4. EXECUTAR SYNC (MICRO-JOB OU COMPLETO)
    // ========================================================================

    // MICRO-JOB: buscar apenas o tipo específico
    if (isMicroJob) {
      console.log(`[Sync] MICRO-JOB mode - fetching only ${data_type}...`)

      if (data_type === 'orders') {
        // Orders vem do Shopify
        if (!hasShopify) {
          throw new Error('Shopify credentials not configured')
        }

        console.log('[Shopify] Fetching orders data...')
        const shopifyData = await fetchShopifyData(
          store.shopify_domain,
          store.shopify_access_token,
          period_start,
          period_end,
          store.timezone_offset || '-03:00'
        )

        // Salvar apenas orders no cache
        const cacheRecord = {
          store_id: store_id,
          data_type: 'orders',
          period_start: period_start,
          period_end: period_end,
          source: 'shopify',
          data: {
            total_orders: shopifyData.pedidos,
            total_sales: shopifyData.totalVendas,
            new_customers: shopifyData.clientesPrimeiraVez || 0,
            returning_customers: shopifyData.clientesRecorrentes || 0,
            returning_rate: shopifyData.taxaClientesRecorrentes || 0,
            top_products: shopifyData.produtosMaisVendidos?.slice(0, 10) || []
          },
          sync_status: 'success',
          record_count: shopifyData.pedidos || 0,
          data_summary: `${shopifyData.pedidos || 0} orders, ${shopifyData.totalVendas || 0} revenue`
        }

        const { error: cacheError } = await supabase
          .from('store_sync_cache')
          .upsert([cacheRecord], {
            onConflict: 'store_id,data_type,period_start,period_end,source'
          })

        if (cacheError) throw cacheError

        // Atualizar job
        await supabase.from('n8n_jobs').update({
          status: 'SUCCESS',
          finished_at: new Date().toISOString(),
          meta: { data_type, processing_time_ms: Date.now() - startTime }
        }).eq('id', job.id)

        return new Response(JSON.stringify({
          success: true,
          job_id: job.id,
          data_type,
          processing_time_ms: Date.now() - startTime,
          summary: { orders: shopifyData.pedidos, revenue: shopifyData.totalVendas }
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      } else {
        // analytics, campaigns, flows vêm do Klaviyo
        console.log('[Klaviyo] Fetching data...')
        const klaviyoData = await fetchKlaviyoData(
          store.klaviyo_private_key,
          period_start,
          period_end
        )

        const campanhas = klaviyoData.campanhas || []
        const flows = klaviyoData.flows || []

        // Calcular métricas baseado no data_type
        let cacheRecord: any

        if (data_type === 'campaigns') {
          let revenueCampaigns = 0
          let conversionsCampaigns = 0
          for (const camp of campanhas) {
            revenueCampaigns += camp.receita || 0
            conversionsCampaigns += camp.conversoes || 0
          }

          const topByRevenue = [...campanhas]
            .sort((a, b) => (b.receita || 0) - (a.receita || 0))
            .slice(0, 10)
            .map(c => ({ id: c.id, name: c.nome, revenue: c.receita || 0, conversions: c.conversoes || 0 }))

          cacheRecord = {
            store_id: store_id,
            data_type: 'campaigns',
            period_start: period_start,
            period_end: period_end,
            source: 'klaviyo',
            data: { campaigns: campanhas, top_by_revenue: topByRevenue },
            sync_status: 'success',
            record_count: campanhas.length,
            data_summary: `${campanhas.length} campaigns, ${revenueCampaigns} revenue`
          }

        } else if (data_type === 'flows') {
          let revenueFlows = 0
          let conversionsFlows = 0
          for (const flow of flows) {
            revenueFlows += flow.receita || 0
            conversionsFlows += flow.conversoes || 0
          }

          cacheRecord = {
            store_id: store_id,
            data_type: 'flows',
            period_start: period_start,
            period_end: period_end,
            source: 'klaviyo',
            data: { flows: flows },
            sync_status: 'success',
            record_count: flows.length,
            data_summary: `${flows.length} flows, ${revenueFlows} revenue`
          }

        } else if (data_type === 'analytics') {
          let revenueCampaigns = 0, conversionsCampaigns = 0
          for (const camp of campanhas) {
            revenueCampaigns += camp.receita || 0
            conversionsCampaigns += camp.conversoes || 0
          }

          let revenueFlows = 0, conversionsFlows = 0
          for (const flow of flows) {
            revenueFlows += flow.receita || 0
            conversionsFlows += flow.conversoes || 0
          }

          cacheRecord = {
            store_id: store_id,
            data_type: 'analytics',
            period_start: period_start,
            period_end: period_end,
            source: 'combined',
            data: {
              revenue_total: revenueCampaigns + revenueFlows,
              revenue_campaigns: revenueCampaigns,
              revenue_flows: revenueFlows,
              orders_attributed: conversionsCampaigns + conversionsFlows,
              campaigns_count: campanhas.length,
              flows_count: flows.length
            },
            sync_status: 'success',
            record_count: campanhas.length + flows.length,
            data_summary: `${revenueCampaigns + revenueFlows} revenue`
          }
        }

        // Salvar no cache
        const { error: cacheError } = await supabase
          .from('store_sync_cache')
          .upsert([cacheRecord], {
            onConflict: 'store_id,data_type,period_start,period_end,source'
          })

        if (cacheError) throw cacheError

        // Atualizar job
        await supabase.from('n8n_jobs').update({
          status: 'SUCCESS',
          finished_at: new Date().toISOString(),
          meta: { data_type, processing_time_ms: Date.now() - startTime }
        }).eq('id', job.id)

        return new Response(JSON.stringify({
          success: true,
          job_id: job.id,
          data_type,
          processing_time_ms: Date.now() - startTime,
          summary: cacheRecord.data
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // ========================================================================
    // MODO COMPLETO (LEGACY) - buscar todos os dados
    // ========================================================================
    console.log('[Sync] FULL SYNC mode - fetching all data...')

    const [klaviyoResult, shopifyResult] = await Promise.allSettled([
      // Klaviyo (sempre executado)
      (async () => {
        console.log('[Parallel] Starting Klaviyo sync...')
        const data = await fetchKlaviyoData(
          store.klaviyo_private_key,
          period_start,
          period_end
        )
        console.log('[Parallel] Klaviyo sync completed')
        return data
      })(),

      // Shopify (se tiver credenciais)
      hasShopify
        ? (async () => {
            console.log('[Parallel] Starting Shopify sync...')
            const data = await fetchShopifyData(
              store.shopify_domain,
              store.shopify_access_token,
              period_start,
              period_end,
              store.timezone_offset || '-03:00'
            )
            console.log('[Parallel] Shopify sync completed')
            return data
          })()
        : Promise.resolve(null)
    ])

    // Verificar erros
    if (klaviyoResult.status === 'rejected') {
      throw new Error(`Klaviyo sync failed: ${klaviyoResult.reason}`)
    }

    if (shopifyResult.status === 'rejected') {
      console.error('[Shopify] Sync failed:', shopifyResult.reason)
      // Shopify é opcional, então não vamos falhar todo o job
    }

    const klaviyoData = klaviyoResult.value
    const shopifyData = shopifyResult.status === 'fulfilled' ? shopifyResult.value : null

    console.log('[Sync] All data fetched successfully')

    // ========================================================================
    // 5. PROCESSAR DADOS KLAVIYO
    // ========================================================================
    const campanhas = klaviyoData.campanhas || []
    const flows = klaviyoData.flows || []

    // Calcular totais de campanhas
    let revenueCampaigns = 0
    let conversionsCampaigns = 0
    let campaignsWithRevenue = 0

    for (const camp of campanhas) {
      revenueCampaigns += camp.receita || 0
      conversionsCampaigns += camp.conversoes || 0
      if ((camp.receita || 0) > 0) {
        campaignsWithRevenue++
      }
    }

    // Calcular totais de flows
    let revenueFlows = 0
    let conversionsFlows = 0
    let flowsWithRevenue = 0
    let flowsWithActivity = 0

    for (const flow of flows) {
      const flowRevenue = flow.receita || 0
      const flowConversions = flow.conversoes || 0

      revenueFlows += flowRevenue
      conversionsFlows += flowConversions

      if (flowRevenue > 0) flowsWithRevenue++
      if (flowConversions > 0 || flowRevenue > 0) flowsWithActivity++
    }

    const revenueTotal = revenueCampaigns + revenueFlows
    const ordersAttributed = conversionsCampaigns + conversionsFlows

    // Top campaigns
    const topCampaignsByRevenue = [...campanhas]
      .sort((a, b) => (b.receita || 0) - (a.receita || 0))
      .slice(0, 10)
      .map(camp => ({
        id: camp.id,
        name: camp.nome,
        revenue: camp.receita || 0,
        conversions: camp.conversoes || 0,
        send_time: camp.data_envio,
        status: camp.status
      }))

    const topCampaignsByConversions = [...campanhas]
      .sort((a, b) => (b.conversoes || 0) - (a.conversoes || 0))
      .slice(0, 10)
      .map(camp => ({
        id: camp.id,
        name: camp.nome,
        revenue: camp.receita || 0,
        conversions: camp.conversoes || 0,
        send_time: camp.data_envio,
        status: camp.status
      }))

    // Flow performance
    const activeFlows = flows.filter(f => f.status === 'live' || f.status === 'manual')
    const flowPerf = activeFlows.length > 0 ? {
      avg_revenue: revenueFlows / activeFlows.length,
      avg_conversions: conversionsFlows / activeFlows.length,
      total_flows: activeFlows.length,
      flows_with_revenue: flowsWithRevenue,
      flows_with_activity: flowsWithActivity
    } : null

    console.log('[Metrics] Klaviyo summary:')
    console.log('  - Total Revenue:', revenueTotal)
    console.log('  - Revenue from Campaigns:', revenueCampaigns)
    console.log('  - Revenue from Flows:', revenueFlows)
    console.log('  - Total Orders:', ordersAttributed)
    console.log('  - Campaigns:', campanhas.length, '(', campaignsWithRevenue, 'with revenue )')
    console.log('  - Flows:', flows.length, '(', flowsWithRevenue, 'with revenue )')

    // ========================================================================
    // 6. SALVAR NO SUPABASE
    // ========================================================================

    // 6.1) Upsert klaviyo_summaries
    console.log('[Database] Saving to klaviyo_summaries...')
    const { error: summaryError } = await supabase
      .from('klaviyo_summaries')
      .upsert({
        store_id: store_id,
        period_start: period_start,
        period_end: period_end,
        revenue_total: revenueTotal,
        revenue_campaigns: revenueCampaigns,
        revenue_flows: revenueFlows,
        orders_attributed: ordersAttributed,
        conversions_campaigns: conversionsCampaigns,
        conversions_flows: conversionsFlows,
        leads_total: 0,
        campaign_count: campanhas.length,
        flow_count: flows.length,
        campaigns_with_revenue: campaignsWithRevenue,
        flows_with_revenue: flowsWithRevenue,
        flows_with_activity: flowsWithActivity,
        flow_perf: flowPerf,
        top_campaigns_by_revenue: topCampaignsByRevenue,
        top_campaigns_by_conversions: topCampaignsByConversions,
        raw: {
          campanhas: campanhas,
          flows: flows,
          metricaId: klaviyoData.metricaId,
          shopify: shopifyData,
          processed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'store_id,period_start,period_end'
      })

    if (summaryError) {
      console.error('[Database] Error saving klaviyo_summaries:', summaryError)
      throw summaryError
    }

    console.log('[Database] ✓ klaviyo_summaries saved')

    // 6.2) Upsert channel_revenue
    if (revenueTotal > 0) {
      console.log('[Database] Saving to channel_revenue...')

      const { error: channelError } = await supabase
        .from('channel_revenue')
        .upsert({
          store_id: store_id,
          period_start: period_start,
          period_end: period_end,
          channel: 'email',
          source: 'sync_store_edge_function',
          revenue: revenueTotal,
          orders_count: ordersAttributed,
          currency: store.currency || 'USD',
          raw: {
            campaigns: revenueCampaigns,
            flows: revenueFlows,
            processed_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'store_id,period_start,period_end,channel'
        })

      if (channelError) {
        console.error('[Database] Error saving channel_revenue:', channelError)
      } else {
        console.log('[Database] ✓ channel_revenue saved')
      }
    }

    // ========================================================================
    // 6.3) SALVAR NO CACHE (NÍVEL 2)
    // ========================================================================
    console.log('[Cache] Saving data to store_sync_cache...')

    try {
      const cacheRecords = [
        // Cache de analytics
        {
          store_id: store_id,
          data_type: 'analytics',
          period_start: period_start,
          period_end: period_end,
          source: 'combined',
          data: {
            revenue_total: revenueTotal,
            revenue_campaigns: revenueCampaigns,
            revenue_flows: revenueFlows,
            orders_attributed: ordersAttributed,
            conversions_campaigns: conversionsCampaigns,
            conversions_flows: conversionsFlows,
            campaigns_count: campanhas.length,
            flows_count: flows.length,
            campaigns_with_revenue: campaignsWithRevenue,
            flows_with_revenue: flowsWithRevenue
          },
          sync_status: 'success'
        },
        // Cache de campanhas
        {
          store_id: store_id,
          data_type: 'campaigns',
          period_start: period_start,
          period_end: period_end,
          source: 'klaviyo',
          data: {
            campaigns: campanhas,
            top_by_revenue: topCampaignsByRevenue,
            top_by_conversions: topCampaignsByConversions
          },
          sync_status: 'success'
        },
        // Cache de flows
        {
          store_id: store_id,
          data_type: 'flows',
          period_start: period_start,
          period_end: period_end,
          source: 'klaviyo',
          data: {
            flows: flows,
            flow_perf: flowPerf
          },
          sync_status: 'success'
        }
      ]

      // Se tem dados Shopify, adicionar
      if (shopifyData) {
        cacheRecords.push({
          store_id: store_id,
          data_type: 'orders',
          period_start: period_start,
          period_end: period_end,
          source: 'shopify',
          data: {
            total_orders: shopifyData.pedidos,
            total_sales: shopifyData.totalVendas,
            new_customers: shopifyData.clientesPrimeiraVez || 0,
            returning_customers: shopifyData.clientesRecorrentes || 0,
            returning_rate: shopifyData.taxaClientesRecorrentes || 0,
            top_products: shopifyData.produtosMaisVendidos?.slice(0, 10) || []
          },
          sync_status: 'success'
        })
      }

      // Fazer upsert em lote
      const { error: cacheError } = await supabase
        .from('store_sync_cache')
        .upsert(cacheRecords, {
          onConflict: 'store_id,data_type,period_start,period_end,source'
        })

      if (cacheError) {
        console.error('[Cache] Error saving to cache:', cacheError)
        // Não vamos falhar todo o sync por erro de cache
      } else {
        console.log('[Cache] ✓ Saved', cacheRecords.length, 'cache entries')
      }
    } catch (cacheErr) {
      console.error('[Cache] Exception saving to cache:', cacheErr)
      // Continua mesmo se cache falhar
    }

    // ========================================================================
    // 7. ATUALIZAR JOB STATUS
    // ========================================================================
    const processingTime = Date.now() - startTime

    console.log('[Job] Updating job status to SUCCESS...')
    const { error: jobUpdateError } = await supabase
      .from('n8n_jobs')
      .update({
        status: 'SUCCESS',
        finished_at: new Date().toISOString(),
        payload: {
          campanhas,
          flows,
          shopify: shopifyData
        },
        meta: {
          processing_time_ms: processingTime,
          klaviyo: {
            campaigns_count: campanhas.length,
            flows_count: flows.length,
            total_revenue: revenueTotal,
            campaigns_revenue: revenueCampaigns,
            flows_revenue: revenueFlows,
            total_orders: ordersAttributed
          },
          shopify: shopifyData ? {
            total_orders: shopifyData.pedidos,
            total_sales: shopifyData.totalVendas,
            returning_customers: shopifyData.clientesRecorrentes
          } : null,
          sync_version: '2.0',
          edge_function: 'sync-store'
        }
      })
      .eq('id', job.id)

    if (jobUpdateError) {
      console.error('[Job] Error updating job:', jobUpdateError)
    } else {
      console.log('[Job] ✓ Status updated to SUCCESS')
    }

    // ========================================================================
    // 8. RETORNAR RESPOSTA
    // ========================================================================
    console.log('='.repeat(80))
    console.log('[SYNC] COMPLETED SUCCESSFULLY')
    console.log('[SYNC] Processing time:', processingTime, 'ms')
    console.log('='.repeat(80))

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        request_id: request_id,
        status: 'SUCCESS',
        period_start,
        period_end,
        processing_time_ms: processingTime,
        summary: {
          klaviyo: {
            total_revenue: revenueTotal,
            campaigns_revenue: revenueCampaigns,
            flows_revenue: revenueFlows,
            total_orders: ordersAttributed,
            campaigns_count: campanhas.length,
            flows_count: flows.length
          },
          shopify: shopifyData ? {
            total_orders: shopifyData.pedidos,
            total_sales: shopifyData.totalVendas,
            returning_customers_rate: shopifyData.taxaClientesRecorrentes
          } : null
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('='.repeat(80))
    console.error('[SYNC] FAILED')
    console.error('='.repeat(80))
    console.error('[Error]', error)
    console.error('='.repeat(80))

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
