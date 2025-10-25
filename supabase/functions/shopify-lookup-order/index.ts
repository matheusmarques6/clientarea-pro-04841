// Edge Function: shopify-lookup-order
// Priority 2: Shopify order integration - automatically lookup order details
// Allows auto-filling return request forms with order data from Shopify

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyProduct {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  variant_title: string;
  sku: string;
  quantity: number;
  price: string;
  image_url?: string;
}

interface ShopifyOrderResponse {
  success: boolean;
  data?: {
    order_id: string;
    order_number: string;
    created_at: string;
    customer: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone?: string;
    };
    shipping_address: {
      address1: string;
      address2?: string;
      city: string;
      province: string;
      country: string;
      zip: string;
    };
    line_items: ShopifyProduct[];
    total_price: string;
    currency: string;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST request.'
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { store_id, order_code } = await req.json();

    if (!store_id || !order_code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: store_id and order_code'
        } as ShopifyOrderResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch store credentials
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('shopify_domain, shopify_access_token')
      .eq('id', store_id)
      .single();

    if (storeError || !store || !store.shopify_domain || !store.shopify_access_token) {
      console.error('Store not found or Shopify not configured:', storeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Store not found or Shopify integration not configured'
        } as ShopifyOrderResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Query Shopify GraphQL API to find order by order number/name
    const shopifyGraphQL = `
      query getOrderByName($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
                email
                firstName
                lastName
                phone
              }
              shippingAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    product {
                      id
                    }
                    variant {
                      id
                      sku
                      image {
                        url
                      }
                    }
                    title
                    variantTitle
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const shopifyResponse = await fetch(
      `https://${store.shopify_domain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.shopify_access_token,
        },
        body: JSON.stringify({
          query: shopifyGraphQL,
          variables: {
            query: `name:${order_code}`,
          },
        }),
      }
    );

    if (!shopifyResponse.ok) {
      throw new Error(`Shopify API error: ${shopifyResponse.status} ${shopifyResponse.statusText}`);
    }

    const shopifyData = await shopifyResponse.json();

    if (shopifyData.errors) {
      console.error('Shopify GraphQL errors:', shopifyData.errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error querying Shopify API'
        } as ShopifyOrderResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const orders = shopifyData.data?.orders?.edges || [];

    if (orders.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Order ${order_code} not found in Shopify`
        } as ShopifyOrderResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const order = orders[0].node;

    // Transform Shopify data to our format
    const lineItems: ShopifyProduct[] = order.lineItems.edges.map((edge: any) => {
      const item = edge.node;
      return {
        id: item.id,
        product_id: item.product?.id || '',
        variant_id: item.variant?.id || '',
        title: item.title,
        variant_title: item.variantTitle || '',
        sku: item.variant?.sku || '',
        quantity: item.quantity,
        price: item.originalUnitPriceSet?.shopMoney?.amount || '0',
        image_url: item.variant?.image?.url,
      };
    });

    const response: ShopifyOrderResponse = {
      success: true,
      data: {
        order_id: order.id,
        order_number: order.name,
        created_at: order.createdAt,
        customer: {
          id: order.customer?.id || '',
          email: order.customer?.email || '',
          first_name: order.customer?.firstName || '',
          last_name: order.customer?.lastName || '',
          phone: order.customer?.phone,
        },
        shipping_address: order.shippingAddress || {
          address1: '',
          city: '',
          province: '',
          country: '',
          zip: '',
        },
        line_items: lineItems,
        total_price: order.totalPriceSet?.shopMoney?.amount || '0',
        currency: order.totalPriceSet?.shopMoney?.currencyCode || 'BRL',
      },
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      } as ShopifyOrderResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
