import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ShopifyProduct {
  id: number
  title: string
  image?: {
    src: string
  }
  variants: Array<{
    id: number
    sku: string
    title: string
    price: string
    inventory_quantity: number
  }>
}

async function fetchShopifyProducts(domain: string, accessToken: string, limit: number = 250) {
  const baseURL = `https://${domain}.myshopify.com/admin/api/2024-10`
  const allProducts: ShopifyProduct[] = []
  let nextPageInfo: string | null = null
  let fetchedCount = 0

  try {
    // Fetch products with pagination (limited to avoid timeout)
    do {
      const url = nextPageInfo
        ? `${baseURL}/products.json?page_info=${encodeURIComponent(nextPageInfo)}&limit=250`
        : `${baseURL}/products.json?limit=250`

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const products = data.products || []
      allProducts.push(...products)
      fetchedCount += products.length

      // Stop if we've fetched enough
      if (fetchedCount >= limit) break

      // Check for next page
      const linkHeader = response.headers.get('link')
      const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)

      if (nextMatch) {
        const nextUrl = nextMatch[1]
        const pageInfoMatch = nextUrl.match(/page_info=([^&]+)/)
        nextPageInfo = pageInfoMatch ? pageInfoMatch[1] : null
      } else {
        nextPageInfo = null
      }

      // Rate limiting: wait a bit between requests
      if (nextPageInfo) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } while (nextPageInfo && fetchedCount < limit)

    return allProducts
  } catch (error) {
    console.error('Error fetching Shopify products:', error)
    throw error
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { storeId, limit = 1000 } = await req.json()

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'storeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get store with Shopify credentials
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, shopify_domain, shopify_access_token, currency')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!store.shopify_domain || !store.shopify_access_token) {
      return new Response(
        JSON.stringify({ error: 'Shopify credentials not configured for this store' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Fetch Products] Fetching products for store: ${store.name}`)

    // Fetch products from Shopify (on-demand, no database save)
    const products = await fetchShopifyProducts(
      store.shopify_domain.replace('.myshopify.com', ''),
      store.shopify_access_token,
      limit
    )

    console.log(`[Fetch Products] Found ${products.length} products`)

    // Get existing costs from database to merge
    const { data: existingCosts } = await supabase
      .from('product_costs')
      .select('*')
      .eq('store_id', storeId)

    const costsMap = new Map(
      (existingCosts || []).map(cost => [cost.sku, cost])
    )

    // Transform to frontend format with costs merged
    const productsWithCosts = []

    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.sku) {
          const existingCost = costsMap.get(variant.sku)

          productsWithCosts.push({
            id: variant.id,
            sku: variant.sku,
            productTitle: product.title,
            variantTitle: variant.title,
            productImage: product.image?.src || null,
            price: parseFloat(variant.price),
            inventory: variant.inventory_quantity,
            // Merge with existing costs
            cost_brl: existingCost?.cost_brl || null,
            cost_usd: existingCost?.cost_usd || null,
            cost_eur: existingCost?.cost_eur || null,
            cost_gbp: existingCost?.cost_gbp || null,
            updated_at: existingCost?.updated_at || null,
            updated_by: existingCost?.updated_by || null,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        products: productsWithCosts,
        totalProducts: products.length,
        totalVariants: productsWithCosts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Fetch Products] Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
