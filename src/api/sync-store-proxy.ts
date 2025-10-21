/**
 * Development-only proxy for sync-store Edge Function
 * This allows local development without deploying Edge Functions
 *
 * In production, the real Edge Function is used instead.
 */

import { supabase } from '@/integrations/supabase/client'

interface SyncStoreParams {
  store_id: string
  period_start: string
  period_end: string
}

interface SyncStoreResult {
  success: boolean
  job_id: string
  request_id: string
  status: 'SUCCESS' | 'RUNNING' | 'FAILED'
  processing_time_ms: number
  summary: {
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
      new_customers: number
      returning_customers: number
    }
  }
}

/**
 * Mock sync function for local development
 * Simulates the behavior of the sync-store Edge Function
 */
export async function syncStoreLocal(params: SyncStoreParams): Promise<SyncStoreResult> {
  const { store_id, period_start, period_end } = params

  console.log('🔧 [DEV MODE] Using local sync proxy')
  console.log('📦 Store ID:', store_id)
  console.log('📅 Period:', period_start, 'to', period_end)

  // Simulate network delay (realistic behavior)
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Fetch store data to make it realistic
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('id', store_id)
    .single()

  if (storeError || !store) {
    throw new Error(`Store not found: ${store_id}`)
  }

  console.log('🏪 Store:', store.name)

  // Create a job record (same as real Edge Function)
  const job_id = crypto.randomUUID()
  const request_id = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`

  // Get current user for created_by field
  const { data: { user } } = await supabase.auth.getUser()

  const { error: jobError } = await supabase
    .from('n8n_jobs')
    .insert({
      id: job_id,
      request_id,
      store_id,
      status: 'PROCESSING',
      source: 'dev_mode_mock',
      period_start,
      period_end,
      created_by: user?.id || 'dev-mode-unknown',
      meta: {
        dev_mode: true,
        store_name: store.name
      }
    })

  if (jobError) {
    console.error('❌ Failed to create job:', jobError)
  }

  // Generate realistic mock data
  const daysInPeriod = Math.ceil(
    (new Date(period_end).getTime() - new Date(period_start).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Simulate realistic numbers based on period length
  const avgOrdersPerDay = Math.floor(Math.random() * 20) + 10
  const avgOrderValue = Math.random() * 100 + 50
  const totalOrders = avgOrdersPerDay * daysInPeriod

  const mockData: SyncStoreResult = {
    success: true,
    job_id,
    request_id,
    status: 'SUCCESS',
    processing_time_ms: 2000,
    summary: {
      klaviyo: {
        total_revenue: Math.round(totalOrders * avgOrderValue * 0.6 * 100) / 100,
        campaigns_revenue: Math.round(totalOrders * avgOrderValue * 0.35 * 100) / 100,
        flows_revenue: Math.round(totalOrders * avgOrderValue * 0.25 * 100) / 100,
        total_orders: Math.floor(totalOrders * 0.6),
        campaigns_count: Math.floor(Math.random() * 15) + 5,
        flows_count: Math.floor(Math.random() * 8) + 3
      },
      shopify: {
        total_orders: totalOrders,
        total_sales: Math.round(totalOrders * avgOrderValue * 100) / 100,
        new_customers: Math.floor(totalOrders * 0.3),
        returning_customers: Math.floor(totalOrders * 0.7)
      }
    }
  }

  // Save mock data to database (same as real function)
  const { error: summaryError } = await supabase
    .from('klaviyo_summaries')
    .insert({
      store_id,
      period_start,
      period_end,
      revenue_total: mockData.summary.klaviyo.total_revenue,
      revenue_campaigns: mockData.summary.klaviyo.campaigns_revenue,
      revenue_flows: mockData.summary.klaviyo.flows_revenue,
      orders_attributed: mockData.summary.klaviyo.total_orders,
      conversions_campaigns: Math.floor(mockData.summary.klaviyo.total_orders * 0.6),
      conversions_flows: Math.floor(mockData.summary.klaviyo.total_orders * 0.4),
      leads_total: 0,
      campaign_count: mockData.summary.klaviyo.campaigns_count,
      flow_count: mockData.summary.klaviyo.flows_count,
      campaigns_with_revenue: mockData.summary.klaviyo.campaigns_count,
      flows_with_revenue: mockData.summary.klaviyo.flows_count,
      metadata: {
        source: 'DEV_MODE_MOCK',
        job_id
      }
    })

  if (summaryError) {
    console.error('❌ Failed to save klaviyo summary:', summaryError)
  }

  // Save channel revenue data
  const { error: channelError } = await supabase
    .from('channel_revenue')
    .insert([
      {
        store_id,
        period_start,
        period_end,
        channel: 'Klaviyo - Campaigns',
        source: 'dev_mode_mock',
        revenue: mockData.summary.klaviyo.campaigns_revenue,
        orders_count: Math.floor(mockData.summary.klaviyo.total_orders * 0.6),
        raw: { job_id, dev_mode: true }
      },
      {
        store_id,
        period_start,
        period_end,
        channel: 'Klaviyo - Flows',
        source: 'dev_mode_mock',
        revenue: mockData.summary.klaviyo.flows_revenue,
        orders_count: Math.floor(mockData.summary.klaviyo.total_orders * 0.4),
        raw: { job_id, dev_mode: true }
      }
    ])

  if (channelError) {
    console.error('❌ Failed to save channel revenue:', channelError)
  }

  // Update job status to SUCCESS
  await supabase
    .from('n8n_jobs')
    .update({
      status: 'SUCCESS',
      finished_at: new Date().toISOString(),
      payload: mockData as any
    })
    .eq('id', job_id)

  console.log('✅ Mock sync completed successfully')
  console.log('📊 Summary:', mockData.summary)

  return mockData
}
