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
 * Fetch REAL Shopify data using Admin API
 */
async function fetchShopifyData(
  shopifyDomain: string,
  accessToken: string,
  periodStart: string,
  periodEnd: string
): Promise<{ total_sales: number; total_orders: number; new_customers: number; returning_customers: number } | null> {
  try {
    console.log('🛒 Fetching REAL Shopify data...')

    // Shopify Admin GraphQL API
    const shopifyUrl = `https://${shopifyDomain}/admin/api/2024-01/graphql.json`

    // GraphQL query to fetch orders in the period
    const query = `
      query getOrders($startDate: DateTime!, $endDate: DateTime!) {
        orders(first: 250, query: "created_at:>='$startDate' AND created_at:<='$endDate'") {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                }
              }
              customer {
                id
                ordersCount
              }
            }
          }
        }
      }
    `

    const variables = {
      startDate: periodStart,
      endDate: periodEnd
    }

    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      console.error('❌ Shopify API error:', response.status, response.statusText)
      return null
    }

    const result = await response.json()

    if (result.errors) {
      console.error('❌ Shopify GraphQL errors:', result.errors)
      return null
    }

    const orders = result.data?.orders?.edges || []
    console.log(`📦 Found ${orders.length} orders in Shopify`)

    // Calculate totals
    let totalSales = 0
    const customerOrderCounts = new Map<string, number>()

    orders.forEach(({ node }: any) => {
      // Sum total sales
      const amount = parseFloat(node.totalPriceSet?.shopMoney?.amount || '0')
      totalSales += amount

      // Track customer order counts
      if (node.customer?.id) {
        const customerId = node.customer.id
        const ordersCount = node.customer.ordersCount || 1
        customerOrderCounts.set(customerId, ordersCount)
      }
    })

    // Calculate new vs returning customers
    let newCustomers = 0
    let returningCustomers = 0

    customerOrderCounts.forEach((ordersCount) => {
      if (ordersCount === 1) {
        newCustomers++
      } else {
        returningCustomers++
      }
    })

    console.log('💰 Shopify Total Sales:', totalSales.toFixed(2))
    console.log('📊 Total Orders:', orders.length)
    console.log('👥 New Customers:', newCustomers)
    console.log('🔄 Returning Customers:', returningCustomers)

    return {
      total_sales: Math.round(totalSales * 100) / 100,
      total_orders: orders.length,
      new_customers: newCustomers,
      returning_customers: returningCustomers
    }
  } catch (error) {
    console.error('❌ Error fetching Shopify data:', error)
    return null
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

  // Check if Shopify credentials are available
  const hasShopifyCredentials = !!(store.shopify_domain && store.shopify_access_token)
  console.log('🔑 Shopify credentials:', hasShopifyCredentials ? 'Available ✅' : 'Not configured ⚠️')

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

  // Fetch REAL Shopify data if credentials are available
  let shopifyData: { total_sales: number; total_orders: number; new_customers: number; returning_customers: number } | null = null

  if (hasShopifyCredentials) {
    shopifyData = await fetchShopifyData(
      store.shopify_domain!,
      store.shopify_access_token!,
      period_start,
      period_end
    )
  }

  // Generate realistic mock data (fallback if no Shopify data)
  const daysInPeriod = Math.ceil(
    (new Date(period_end).getTime() - new Date(period_start).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Use REAL Shopify data if available, otherwise mock data
  let totalOrders: number
  let totalSales: number
  let newCustomers: number
  let returningCustomers: number

  if (shopifyData) {
    console.log('✅ Using REAL Shopify data')
    totalOrders = shopifyData.total_orders
    totalSales = shopifyData.total_sales
    newCustomers = shopifyData.new_customers
    returningCustomers = shopifyData.returning_customers
  } else {
    console.log('⚠️ Using MOCK data (Shopify credentials not configured or API failed)')
    const avgOrdersPerDay = Math.floor(Math.random() * 20) + 10
    const avgOrderValue = Math.random() * 100 + 50
    totalOrders = avgOrdersPerDay * daysInPeriod
    totalSales = Math.round(totalOrders * avgOrderValue * 100) / 100
    newCustomers = Math.floor(totalOrders * 0.3)
    returningCustomers = Math.floor(totalOrders * 0.7)
  }

  // Generate realistic campaign names
  const campaignThemes = ['SOFT SELL', 'CREDITO NA LOJA', 'BLACK FRIDAY', 'LANCAMENTO', 'NEWSLETTER', 'PROMOCAO', 'DESCONTO EXCLUSIVO']
  const campaignSegments = ['TODOS OS LEADS', 'ENGAJADOS', 'VIP', 'ABANDONADORES', 'COMPRADORES']
  const campaignLanguages = ['PORTUGUÊS', 'INGLÊS', 'ESPANHOL']

  const generateCampaignName = () => {
    const date = new Date(period_start)
    date.setDate(date.getDate() + Math.floor(Math.random() * daysInPeriod))
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const hour = String(Math.floor(Math.random() * 24)).padStart(2, '0')
    const minute = ['00', '15', '30', '45'][Math.floor(Math.random() * 4)]

    const theme = campaignThemes[Math.floor(Math.random() * campaignThemes.length)]
    const segment = campaignSegments[Math.floor(Math.random() * campaignSegments.length)]
    const language = campaignLanguages[Math.floor(Math.random() * campaignLanguages.length)]

    return `[${day}/${month}] - [${hour}:${minute}] - [${segment}] - [${theme}] - [${language}]`
  }

  // Generate 5-10 realistic campaigns
  const numCampaigns = Math.floor(Math.random() * 6) + 5 // 5-10 campaigns
  const mockCampaigns = Array.from({ length: numCampaigns }, () => {
    const revenue = Math.random() * 5000 + 500 // R$ 500-5500
    const conversions = Math.floor(Math.random() * 50) + 5 // 5-55 conversions

    const sendDate = new Date(period_start)
    sendDate.setDate(sendDate.getDate() + Math.floor(Math.random() * daysInPeriod))

    return {
      id: crypto.randomUUID(),
      name: generateCampaignName(),
      revenue: Math.round(revenue * 100) / 100,
      conversions,
      send_time: sendDate.toISOString(),
      status: 'Sent'
    }
  })

  // Sort campaigns by revenue for top_campaigns_by_revenue
  const topByRevenue = [...mockCampaigns].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Sort campaigns by conversions for top_campaigns_by_conversions
  const topByConversions = [...mockCampaigns].sort((a, b) => b.conversions - a.conversions).slice(0, 5)

  // Generate 3-5 realistic flows
  const flowTypes = [
    'Welcome Series',
    'Abandoned Cart',
    'Post-Purchase Thank You',
    'Browse Abandonment',
    'Win-Back Campaign'
  ]

  const numFlows = Math.floor(Math.random() * 3) + 3 // 3-5 flows
  const mockFlows = flowTypes.slice(0, numFlows).map((flowName) => {
    const revenue = Math.random() * 15000 + 2000 // R$ 2000-17000 (flows geram mais)
    const conversions = Math.floor(Math.random() * 100) + 20 // 20-120 conversions

    return {
      id: crypto.randomUUID(),
      name: flowName,
      revenue: Math.round(revenue * 100) / 100,
      conversions,
      trigger_type: flowName.includes('Cart') ? 'Checkout Started' : flowName.includes('Welcome') ? 'List Subscription' : 'Metric Trigger',
      status: 'Live'
    }
  })

  const topFlowsByRevenue = [...mockFlows].sort((a, b) => b.revenue - a.revenue)
  const topFlowsByPerformance = [...mockFlows].sort((a, b) => b.conversions - a.conversions)

  console.log(`📧 Generated ${mockCampaigns.length} mock campaigns`)
  console.log(`🔄 Generated ${mockFlows.length} mock flows`)

  const mockData: SyncStoreResult = {
    success: true,
    job_id,
    request_id,
    status: 'SUCCESS',
    processing_time_ms: 2000,
    summary: {
      klaviyo: {
        total_revenue: Math.round(totalSales * 0.6 * 100) / 100, // Klaviyo = 60% of total sales
        campaigns_revenue: Math.round(totalSales * 0.35 * 100) / 100, // Campaigns = 35% of total
        flows_revenue: Math.round(totalSales * 0.25 * 100) / 100, // Flows = 25% of total
        total_orders: Math.floor(totalOrders * 0.6),
        campaigns_count: Math.floor(Math.random() * 15) + 5,
        flows_count: Math.floor(Math.random() * 8) + 3
      },
      shopify: {
        total_orders: totalOrders,
        total_sales: totalSales, // Use REAL or MOCK Shopify total sales
        new_customers: newCustomers,
        returning_customers: returningCustomers
      }
    }
  }

  // Save mock data to database (same as real function)
  const { error: summaryError } = await supabase
    .from('klaviyo_summaries')
    .upsert({
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
      // Top campaigns and flows
      top_campaigns_by_revenue: topByRevenue as any,
      top_campaigns_by_conversions: topByConversions as any,
      top_flows_by_revenue: topFlowsByRevenue as any,
      top_flows_by_performance: topFlowsByPerformance as any,
      // Shopify data - CRITICAL for correct impact % calculation
      shopify_total_sales: mockData.summary.shopify.total_sales,
      shopify_total_orders: mockData.summary.shopify.total_orders,
      shopify_new_customers: mockData.summary.shopify.new_customers,
      shopify_returning_customers: mockData.summary.shopify.returning_customers
    }, {
      onConflict: 'store_id,period_start,period_end'
    })

  if (summaryError) {
    console.error('❌ Failed to save klaviyo summary:', summaryError)
  }

  // Save channel revenue data
  // Note: Skip this in dev mode due to RLS policies - not critical for mock data
  // The klaviyo_summaries table has all the data needed for dashboard
  console.log('ℹ️ Skipping channel_revenue insert (RLS restricted, data in klaviyo_summaries)')

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
