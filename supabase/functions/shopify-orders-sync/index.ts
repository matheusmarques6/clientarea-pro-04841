import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('storeId');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting Shopify sync for store ${storeId}`);

    // Verificar acesso do usuário à loja
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error('Invalid user token');
    }

    // Verificar se o usuário tem acesso à loja
    const { data: userStore } = await supabase
      .from('v_user_stores')
      .select('*')
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .single();

    if (!userStore) {
      throw new Error('Access denied to store');
    }

    // Buscar credenciais do Shopify
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('store_id', storeId)
      .eq('provider', 'shopify')
      .eq('status', 'connected')
      .single();

    if (!integration) {
      return new Response(JSON.stringify({ 
        error: 'Shopify integration not found or not connected',
        hint: 'Please configure Shopify integration first'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const shopDomain = integration.extra?.shop_domain;
    const accessToken = integration.key_secret_encrypted; // Em produção, descriptografar

    if (!shopDomain || !accessToken) {
      throw new Error('Missing Shopify credentials');
    }

    // Construir URL da API do Shopify
    const apiVersion = '2023-10';
    let apiUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=250&status=any`;
    
    if (fromDate) {
      apiUrl += `&created_at_min=${fromDate}`;
    }
    if (toDate) {
      apiUrl += `&created_at_max=${toDate}`;
    }

    console.log(`Fetching orders from Shopify: ${apiUrl}`);

    // Buscar pedidos do Shopify
    const shopifyResponse = await fetch(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      
      if (shopifyResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          hint: 'Please try again later'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Shopify API error: ${shopifyResponse.status}`);
    }

    const shopifyData = await shopifyResponse.json();
    const orders: ShopifyOrder[] = shopifyData.orders || [];

    console.log(`Found ${orders.length} orders from Shopify`);

    // Processar e inserir pedidos
    const processedOrders = [];
    
    for (const order of orders) {
      try {
        const orderData = {
          store_id: storeId,
          shopify_id: order.id,
          code: order.name,
          total: parseFloat(order.total_price || '0'),
          currency: order.currency,
          created_at: order.created_at,
          status: order.financial_status,
          raw: order,
        };

        // Upsert order
        const { error: upsertError } = await supabase
          .from('orders')
          .upsert(orderData, {
            onConflict: 'shopify_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error upserting order:', upsertError);
          continue;
        }

        processedOrders.push(orderData);
      } catch (error) {
        console.error('Error processing order:', error);
        continue;
      }
    }

    console.log(`Successfully processed ${processedOrders.length} orders`);

    return new Response(JSON.stringify({
      success: true,
      processed: processedOrders.length,
      total: orders.length,
      period: { from: fromDate, to: toDate },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in shopify-orders-sync:', error);
    return new Response(JSON.stringify({
      error: error.message,
      hint: 'Check your Shopify integration configuration'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});