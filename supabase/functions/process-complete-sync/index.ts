import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-signature, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface Campaign {
  id: string
  nome: string
  status: string
  data_envio: string
  receita: number
  conversoes: number
}

interface Flow {
  id: string
  nome: string
  status: string
  created?: string
  updated?: string
  receita?: number
  conversoes?: number
}

interface ShopifySummary {
  pedidos: number
  pedidosProcessados: number
  vendasBrutas: number
  descontos: number
  devolucoes: number
  vendasLiquidas: number
  cobrancasFrete: number
  tributos: number
  totalVendas: number
  ticketMedio: number
  taxaClientesRecorrentes: number
  clientesTotalPeriodo: number
  clientesRecorrentes: number
  clientesPrimeiraVez: number
  produtosMaisVendidos?: any[]
  produtosMaisReceita?: any[]
}

interface CompletePayload {
  request_id: string
  storeId: string
  startDate: string
  endDate: string
  campanhas?: Campaign[]
  flows?: Flow[]
  metricaId?: string
  shopify?: ShopifySummary
  // Legacy fields support
  store?: { id: string }
  store_id?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Initialize Supabase client with service role for webhook
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.text()
    let payload: CompletePayload

    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error('Invalid JSON payload:', error)
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('='.repeat(80))
    console.log('COMPLETE SYNC CALLBACK RECEIVED')
    console.log('='.repeat(80))
    console.log('Timestamp:', new Date().toISOString())
    console.log('Request ID:', payload.request_id)
    console.log('Payload size:', body.length, 'bytes')
    console.log('Has campanhas:', !!payload.campanhas, '- Count:', payload.campanhas?.length || 0)
    console.log('Has flows:', !!payload.flows, '- Count:', payload.flows?.length || 0)
    console.log('Has shopify:', !!payload.shopify)
    console.log('Has metricaId:', !!payload.metricaId, '-', payload.metricaId)
    console.log('-'.repeat(80))

    // Extract fields with fallbacks
    const requestId = payload.request_id
    const storeId = payload.storeId || payload.store?.id || payload.store_id
    const periodStart = payload.startDate
    const periodEnd = payload.endDate

    if (!requestId || !storeId || !periodStart || !periodEnd) {
      console.error('Missing required fields:', { requestId, storeId, periodStart, periodEnd })
      return new Response(JSON.stringify({
        error: 'Missing required fields: request_id, storeId, startDate, endDate'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find job by request_id
    const { data: job, error: jobError } = await supabase
      .from('n8n_jobs')
      .select('*')
      .eq('request_id', requestId)
      .single()

    if (jobError || !job) {
      console.error('Job not found for request_id:', requestId, jobError)
      return new Response(JSON.stringify({
        error: 'Job not found',
        request_id: requestId
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Found job:', job.id, '- Store:', job.store_id, '- Period:', job.period_start, 'to', job.period_end)

    // ========================================================================
    // PROCESS KLAVIYO DATA (Campaigns + Flows)
    // ========================================================================

    const campanhas = payload.campanhas || []
    const flows = payload.flows || []

    // Calculate totals from campaigns
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

    // Calculate totals from flows (if they have metrics)
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

    // Top campaigns by revenue
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

    // Top campaigns by conversions
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

    // Flow performance averages
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

    // Upsert to klaviyo_summaries
    const klaviyoSummaryData = {
      store_id: storeId,
      period_start: periodStart,
      period_end: periodEnd,
      revenue_total: revenueTotal,
      revenue_campaigns: revenueCampaigns,
      revenue_flows: revenueFlows,
      orders_attributed: ordersAttributed,
      conversions_campaigns: conversionsCampaigns,
      conversions_flows: conversionsFlows,
      leads_total: 0, // Will be updated separately if needed
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
        metricaId: payload.metricaId,
        processed_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    }

    console.log('Upserting klaviyo_summaries...')
    const { data: summaryResult, error: summaryError } = await supabase
      .from('klaviyo_summaries')
      .upsert(klaviyoSummaryData, {
        onConflict: 'store_id,period_start,period_end',
        ignoreDuplicates: false
      })
      .select()

    if (summaryError) {
      console.error('Error upserting klaviyo_summaries:', summaryError)
      throw summaryError
    }

    console.log('✓ klaviyo_summaries saved successfully')

    // Save to channel_revenue
    if (revenueTotal > 0) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('currency')
        .eq('id', storeId)
        .single()

      const channelRevenueData = {
        store_id: storeId,
        period_start: periodStart,
        period_end: periodEnd,
        channel: 'email',
        source: 'klaviyo_complete_sync',
        revenue: revenueTotal,
        orders_count: ordersAttributed,
        currency: storeData?.currency || 'USD',
        raw: {
          campaigns: revenueCampaigns,
          flows: revenueFlows,
          processed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }

      console.log('Upserting channel_revenue...')
      const { error: channelError } = await supabase
        .from('channel_revenue')
        .upsert(channelRevenueData, {
          onConflict: 'store_id,period_start,period_end,channel',
          ignoreDuplicates: false
        })

      if (channelError) {
        console.error('Error saving channel_revenue:', channelError)
        // Don't fail, just log
      } else {
        console.log('✓ channel_revenue saved successfully')
      }
    }

    // ========================================================================
    // PROCESS SHOPIFY DATA (Optional)
    // ========================================================================

    if (payload.shopify) {
      console.log('Processing Shopify data...')
      console.log('  - Total Orders:', payload.shopify.pedidos)
      console.log('  - Total Sales:', payload.shopify.totalVendas)
      console.log('  - Ticket Médio:', payload.shopify.ticketMedio)
      console.log('  - Clientes Recorrentes:', payload.shopify.clientesRecorrentes)

      // You can save Shopify data to a separate table or use it to enrich klaviyo data
      // For now, we'll include it in the job metadata
    }

    // ========================================================================
    // UPDATE JOB STATUS
    // ========================================================================

    const processingTime = Date.now() - startTime

    const { error: jobUpdateError } = await supabase
      .from('n8n_jobs')
      .update({
        status: 'SUCCESS',
        finished_at: new Date().toISOString(),
        payload: payload, // Store complete payload
        meta: {
          callback_received_at: new Date().toISOString(),
          processing_time_ms: processingTime,
          klaviyo: {
            campaigns_count: campanhas.length,
            flows_count: flows.length,
            total_revenue: revenueTotal,
            campaigns_revenue: revenueCampaigns,
            flows_revenue: revenueFlows,
            total_orders: ordersAttributed
          },
          shopify: payload.shopify ? {
            total_orders: payload.shopify.pedidos,
            total_sales: payload.shopify.totalVendas,
            returning_customers: payload.shopify.clientesRecorrentes
          } : null
        }
      })
      .eq('id', job.id)

    if (jobUpdateError) {
      console.error('Error updating job status:', jobUpdateError)
      throw jobUpdateError
    }

    console.log('✓ Job status updated to SUCCESS')
    console.log('='.repeat(80))
    console.log('SYNC COMPLETED SUCCESSFULLY')
    console.log('Processing time:', processingTime, 'ms')
    console.log('='.repeat(80))

    return new Response(JSON.stringify({
      success: true,
      job_id: job.id,
      request_id: requestId,
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
        shopify: payload.shopify ? {
          total_orders: payload.shopify.pedidos,
          total_sales: payload.shopify.totalVendas
        } : null
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('='.repeat(80))
    console.error('ERROR IN COMPLETE SYNC CALLBACK')
    console.error('='.repeat(80))
    console.error('Error:', error)
    console.error('Stack:', error.stack)
    console.error('='.repeat(80))

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
