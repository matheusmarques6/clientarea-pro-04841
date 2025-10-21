// ============================================================================
// SYNC SERVICE - Orquestrador Principal
// Executa sincronização completa: Klaviyo + Shopify → Supabase
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { fetchKlaviyoCampaigns } from './klaviyo-campaigns'
import { fetchKlaviyoFlows } from './klaviyo-flows'
import { fetchShopifyData } from './shopify-data'

export interface SyncCredentials {
  klaviyoApiKey: string
  shopifyDomain: string
  shopifyAccessToken: string
  storeTimezoneOffset?: string
}

export interface SyncResult {
  success: boolean
  jobId?: string
  error?: string
  summary?: {
    klaviyo: {
      total_revenue: number
      campaigns_revenue: number
      flows_revenue: number
      total_orders: number
      campaigns_count: number
      flows_count: number
    }
    shopify: {
      total_orders: number
      total_sales: number
    }
  }
  processingTimeMs?: number
}

/**
 * Executa sincronização completa de dados
 *
 * @param storeId - ID da loja no Supabase
 * @param credentials - Credenciais de API (Klaviyo + Shopify)
 * @param startDate - Data inicial (YYYY-MM-DD)
 * @param endDate - Data final (YYYY-MM-DD)
 * @param supabase - Cliente Supabase
 */
export async function syncStoreData(
  storeId: string,
  credentials: SyncCredentials,
  startDate: string,
  endDate: string,
  supabase: ReturnType<typeof createClient>
): Promise<SyncResult> {

  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`

  console.log('='.repeat(80))
  console.log('SYNC STARTED')
  console.log('='.repeat(80))
  console.log('Store ID:', storeId)
  console.log('Period:', startDate, 'to', endDate)
  console.log('Request ID:', requestId)
  console.log('-'.repeat(80))

  try {
    // Criar registro de job
    const { data: job, error: jobError } = await supabase
      .from('n8n_jobs')
      .insert({
        store_id: storeId,
        period_start: startDate,
        period_end: endDate,
        request_id: requestId,
        status: 'PROCESSING',
        source: 'frontend_sync',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create job:', jobError)
      return {
        success: false,
        error: 'Failed to create sync job'
      }
    }

    console.log('✓ Job created:', job.id)

    // ========================================================================
    // EXECUÇÃO PARALELA: Klaviyo + Shopify
    // ========================================================================

    console.log('Starting parallel data fetch...')

    const [
      klaviyoCampaignsResult,
      shopifyResult
    ] = await Promise.allSettled([
      // Klaviyo (campanhas + flows sequencial dentro)
      (async () => {
        console.log('[Parallel] Starting Klaviyo sync...')

        // Buscar campanhas
        const campanhasData = await fetchKlaviyoCampaigns(
          credentials.klaviyoApiKey,
          startDate,
          endDate
        )

        // Buscar flows usando metricaId das campanhas
        const flowsData = await fetchKlaviyoFlows(
          credentials.klaviyoApiKey,
          campanhasData.metricaId,
          startDate,
          endDate
        )

        console.log('[Parallel] Klaviyo sync completed')
        return { ...campanhasData, ...flowsData }
      })(),

      // Shopify
      (async () => {
        console.log('[Parallel] Starting Shopify sync...')
        const data = await fetchShopifyData(
          credentials.shopifyDomain,
          credentials.shopifyAccessToken,
          startDate,
          endDate,
          credentials.storeTimezoneOffset
        )
        console.log('[Parallel] Shopify sync completed')
        return data
      })()
    ])

    // Verificar erros
    if (klaviyoCampaignsResult.status === 'rejected') {
      throw new Error(`Klaviyo sync failed: ${klaviyoCampaignsResult.reason}`)
    }

    if (shopifyResult.status === 'rejected') {
      throw new Error(`Shopify sync failed: ${shopifyResult.reason}`)
    }

    const klaviyoData = klaviyoCampaignsResult.value
    const shopifyData = shopifyResult.value

    console.log('✓ All data fetched successfully')

    // ========================================================================
    // PROCESSAR DADOS KLAVIYO
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

    console.log('Klaviyo Metrics Calculated:')
    console.log('  - Total Revenue:', revenueTotal)
    console.log('  - Revenue from Campaigns:', revenueCampaigns)
    console.log('  - Revenue from Flows:', revenueFlows)
    console.log('  - Total Orders:', ordersAttributed)
    console.log('  - Campaigns with Revenue:', campaignsWithRevenue, '/', campanhas.length)
    console.log('  - Flows with Revenue:', flowsWithRevenue, '/', flows.length)

    // ========================================================================
    // SALVAR NO SUPABASE
    // ========================================================================

    // 1) Upsert klaviyo_summaries
    console.log('Saving to klaviyo_summaries...')
    const { error: summaryError } = await supabase
      .from('klaviyo_summaries')
      .upsert({
        store_id: storeId,
        period_start: startDate,
        period_end: endDate,
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
          processed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'store_id,period_start,period_end'
      })

    if (summaryError) {
      console.error('Error saving klaviyo_summaries:', summaryError)
      throw summaryError
    }

    console.log('✓ klaviyo_summaries saved')

    // 2) Upsert channel_revenue
    if (revenueTotal > 0) {
      console.log('Saving to channel_revenue...')

      // Buscar currency da store
      const { data: storeData } = await supabase
        .from('stores')
        .select('currency')
        .eq('id', storeId)
        .single()

      const { error: channelError } = await supabase
        .from('channel_revenue')
        .upsert({
          store_id: storeId,
          period_start: startDate,
          period_end: endDate,
          channel: 'email',
          source: 'frontend_sync',
          revenue: revenueTotal,
          orders_count: ordersAttributed,
          currency: storeData?.currency || 'USD',
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
        console.error('Error saving channel_revenue:', channelError)
      } else {
        console.log('✓ channel_revenue saved')
      }
    }

    // 3) Atualizar job status
    const processingTime = Date.now() - startTime

    console.log('Updating job status...')
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
          shopify: {
            total_orders: shopifyData.pedidos,
            total_sales: shopifyData.totalVendas,
            returning_customers: shopifyData.clientesRecorrentes
          }
        }
      })
      .eq('id', job.id)

    if (jobUpdateError) {
      console.error('Error updating job:', jobUpdateError)
    } else {
      console.log('✓ Job status updated to SUCCESS')
    }

    console.log('='.repeat(80))
    console.log('SYNC COMPLETED SUCCESSFULLY')
    console.log('Processing time:', processingTime, 'ms')
    console.log('='.repeat(80))

    return {
      success: true,
      jobId: job.id,
      processingTimeMs: processingTime,
      summary: {
        klaviyo: {
          total_revenue: revenueTotal,
          campaigns_revenue: revenueCampaigns,
          flows_revenue: revenueFlows,
          total_orders: ordersAttributed,
          campaigns_count: campanhas.length,
          flows_count: flows.length
        },
        shopify: {
          total_orders: shopifyData.pedidos,
          total_sales: shopifyData.totalVendas
        }
      }
    }

  } catch (error: any) {
    console.error('='.repeat(80))
    console.error('SYNC FAILED')
    console.error('='.repeat(80))
    console.error('Error:', error)
    console.error('='.repeat(80))

    // Atualizar job como ERROR
    const { data: job } = await supabase
      .from('n8n_jobs')
      .select()
      .eq('request_id', requestId)
      .single()

    if (job) {
      await supabase
        .from('n8n_jobs')
        .update({
          status: 'ERROR',
          finished_at: new Date().toISOString(),
          error: error.message || error.toString()
        })
        .eq('id', job.id)
    }

    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    }
  }
}
