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

async function fetchShopifyProducts(domain: string, accessToken: string) {
  const baseURL = `https://${domain}.myshopify.com/admin/api/2024-10`
  const allProducts: ShopifyProduct[] = []
  let nextPageInfo: string | null = null

  try {
    // Fetch products with pagination
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
      allProducts.push(...(data.products || []))

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
    } while (nextPageInfo)

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
    const { storeId } = await req.json()

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

    console.log(`[Sync Products] Fetching products for store: ${store.name}`)

    // Fetch products from Shopify
    const products = await fetchShopifyProducts(
      store.shopify_domain.replace('.myshopify.com', ''),
      store.shopify_access_token
    )

    console.log(`[Sync Products] Found ${products.length} products`)

    // Prepare data for database
    const productsToInsert = []
    const costsToInsert = []

    for (const product of products) {
      // Insert product
      productsToInsert.push({
        product_id_ext: product.id.toString(),
        title: product.title,
        image_url: product.image?.src || null,
        store_id: storeId,
      })

      // Insert variants as product costs
      for (const variant of product.variants) {
        if (variant.sku) {
          costsToInsert.push({
            sku: variant.sku,
            product_title: product.title,
            variant_title: variant.title,
            price: parseFloat(variant.price),
            store_id: storeId,
          })
        }
      }
    }

    // Upsert products
    if (productsToInsert.length > 0) {
      const { error: productsError } = await supabase
        .from('products')
        .upsert(productsToInsert, {
          onConflict: 'product_id_ext,store_id',
          ignoreDuplicates: false
        })

      if (productsError) {
        console.error('[Sync Products] Error inserting products:', productsError)
      }
    }

    // Upsert product costs
    if (costsToInsert.length > 0) {
      const { error: costsError } = await supabase
        .from('product_costs')
        .upsert(costsToInsert, {
          onConflict: 'sku,store_id',
          ignoreDuplicates: false
        })

      if (costsError) {
        console.error('[Sync Products] Error inserting costs:', costsError)
      }
    }

    console.log(`[Sync Products] Successfully synced ${productsToInsert.length} products and ${costsToInsert.length} variants`)

    return new Response(
      JSON.stringify({
        success: true,
        productsCount: productsToInsert.length,
        variantsCount: costsToInsert.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Sync Products] Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
