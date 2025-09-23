import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyOrder {
  id: number;
  name: string;
  total_price: string;
  currency: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('storeId');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'storeId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log início da sincronização
    const syncStarted = new Date().toISOString();
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        store_id: storeId,
        provider: 'shopify',
        sync_type: 'orders',
        status: 'running',
        started_at: syncStarted,
        message: `Iniciando sincronização de pedidos do período ${fromDate} a ${toDate}`
      })
      .select()
      .single();

    // Buscar credenciais do Shopify para a loja
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('key_public, key_secret_encrypted, extra')
      .eq('store_id', storeId)
      .eq('provider', 'shopify')
      .eq('status', 'connected')
      .single();

    if (integrationError || !integration) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          message: 'Integração com Shopify não encontrada ou não configurada',
          finished_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      return new Response(
        JSON.stringify({ error: 'Shopify integration not found or not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopDomain = integration.key_public || (integration.extra as any)?.url;
    const accessToken = integration.key_secret_encrypted;

    if (!shopDomain || !accessToken) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          message: 'Credenciais do Shopify incompletas',
          finished_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      return new Response(
        JSON.stringify({ error: 'Incomplete Shopify credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir URL da API do Shopify
    const shopifyUrl = new URL(`https://${shopDomain}/admin/api/2023-10/orders.json`);
    shopifyUrl.searchParams.set('limit', '250');
    shopifyUrl.searchParams.set('status', 'any');
    
    if (fromDate) {
      shopifyUrl.searchParams.set('created_at_min', fromDate);
    }
    if (toDate) {
      shopifyUrl.searchParams.set('created_at_max', toDate);
    }

    console.log('Fetching orders from Shopify:', shopifyUrl.toString());

    // Buscar pedidos do Shopify
    const shopifyResponse = await fetch(shopifyUrl.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          message: `Erro na API do Shopify: ${shopifyResponse.status} - ${errorText}`,
          finished_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      return new Response(
        JSON.stringify({ error: `Shopify API error: ${shopifyResponse.status}` }),
        { status: shopifyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopifyData = await shopifyResponse.json();
    const orders: ShopifyOrder[] = shopifyData.orders || [];

    console.log(`Found ${orders.length} orders from Shopify`);

    // Processar pedidos e fazer upsert no banco
    let processedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        const orderData = {
          store_id: storeId,
          shopify_id: order.id,
          code: order.name,
          total: parseFloat(order.total_price),
          currency: order.currency,
          status: order.financial_status,
          created_at: order.created_at,
          raw: order
        };

        const { error: orderError } = await supabase
          .from('orders')
          .upsert(orderData, {
            onConflict: 'shopify_id',
            ignoreDuplicates: false
          });

        if (orderError) {
          console.error('Error upserting order:', order.id, orderError);
          errorCount++;
        } else {
          processedCount++;
        }
      } catch (error) {
        console.error('Error processing order:', order.id, error);
        errorCount++;
      }
    }

    // Atualizar log da sincronização
    const status = errorCount > 0 ? (processedCount > 0 ? 'partial' : 'error') : 'success';
    const message = `Processados ${processedCount} pedidos com sucesso. ${errorCount} erros.`;

    await supabase
      .from('sync_logs')
      .update({
        status,
        message,
        records_processed: processedCount,
        finished_at: new Date().toISOString()
      })
      .eq('id', syncLog?.id);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: orders.length,
        message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in shopify-orders-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});