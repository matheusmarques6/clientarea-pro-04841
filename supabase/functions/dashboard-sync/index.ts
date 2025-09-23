import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('storeId');
    const fromDate = url.searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = url.searchParams.get('to') || new Date().toISOString();

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'storeId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Synchronizing dashboard data for store ${storeId} from ${fromDate} to ${toDate}`);

    // Inicializar Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const syncPromises = [];

    // Sincronizar pedidos do Shopify
    const shopifyUrl = new URL(`${supabaseUrl}/functions/v1/shopify-orders-sync`);
    shopifyUrl.searchParams.set('storeId', storeId);
    shopifyUrl.searchParams.set('from', fromDate);
    shopifyUrl.searchParams.set('to', toDate);

    syncPromises.push(
      fetch(shopifyUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      })
      .then(res => res.json())
      .then(data => ({ provider: 'shopify', result: data }))
      .catch(error => ({ provider: 'shopify', error: error.message }))
    );

    // Sincronizar receita do Klaviyo
    const klaviyoUrl = new URL(`${supabaseUrl}/functions/v1/klaviyo-revenue-sync`);
    klaviyoUrl.searchParams.set('storeId', storeId);
    klaviyoUrl.searchParams.set('from', fromDate);
    klaviyoUrl.searchParams.set('to', toDate);

    syncPromises.push(
      fetch(klaviyoUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      })
      .then(res => res.json())
      .then(data => ({ provider: 'klaviyo', result: data }))
      .catch(error => ({ provider: 'klaviyo', error: error.message }))
    );

    // Executar sincronizações em paralelo
    const syncResults = await Promise.all(syncPromises);

    // Agregar resultados
    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      period: { from: fromDate, to: toDate },
      sync_results: syncResults,
      summary: {
        shopify: syncResults.find(r => r.provider === 'shopify'),
        klaviyo: syncResults.find(r => r.provider === 'klaviyo'),
      }
    };

    // Log consolidado da sincronização
    await supabase
      .from('sync_logs')
      .insert({
        store_id: storeId,
        provider: 'dashboard',
        sync_type: 'full',
        status: syncResults.every(r => !r.error) ? 'success' : 'partial',
        message: `Sincronização completa do dashboard`,
        records_processed: syncResults.reduce((acc, r) => acc + (r.result?.processed || 0), 0),
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in dashboard-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});