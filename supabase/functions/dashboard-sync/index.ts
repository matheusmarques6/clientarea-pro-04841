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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extrair storeId tanto da query string quanto do body
    const url = new URL(req.url);
    let storeId = url.searchParams.get('storeId');
    
    // Se não estiver na query string, tentar extrair do body
    if (!storeId) {
      try {
        const body = await req.json();
        storeId = body.storeId;
      } catch {
        // Body vazio ou inválido
      }
    }

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting dashboard sync for store ${storeId}`);

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

    // Definir período de sincronização (últimos 30 dias)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const fromISO = startDate.toISOString();
    const toISO = endDate.toISOString();

    console.log(`Syncing data from ${fromISO} to ${toISO}`);

    // URLs das funções de sincronização
    const baseUrl = Deno.env.get('SUPABASE_URL');
    const shopifyUrl = `${baseUrl}/functions/v1/shopify_orders_sync`;
    const klaviyoUrl = `${baseUrl}/functions/v1/klaviyo_summary`;

    const results = {
      shopify: { success: false, error: null as string | null, data: null as any },
      klaviyo: { success: false, error: null as string | null, data: null as any },
    };

    // Sincronizar Shopify
    try {
      const shopifyResponse = await fetch(shopifyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        })
      });

      if (shopifyResponse.ok) {
        results.shopify.data = await shopifyResponse.json();
        results.shopify.success = true;
        console.log('Shopify sync completed successfully');
      } else {
        const errorData = await shopifyResponse.json();
        results.shopify.error = errorData.error || 'Unknown error';
        console.error('Shopify sync failed:', results.shopify.error);
      }
    } catch (error) {
      results.shopify.error = error.message;
      console.error('Shopify sync error:', error);
    }

    // Sincronizar Klaviyo
    try {
      const klaviyoResponse = await fetch(klaviyoUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
          fast: true // Use fast mode for dashboard sync
        })
      });

      if (klaviyoResponse.ok) {
        results.klaviyo.data = await klaviyoResponse.json();
        results.klaviyo.success = true;
        console.log('Klaviyo sync completed successfully');
      } else {
        const errorData = await klaviyoResponse.json();
        results.klaviyo.error = errorData.error || 'Unknown error';
        console.error('Klaviyo sync failed:', results.klaviyo.error);
      }
    } catch (error) {
      results.klaviyo.error = error.message;
      console.error('Klaviyo sync error:', error);
    }

    const overallSuccess = results.shopify.success || results.klaviyo.success;

    return new Response(JSON.stringify({
      success: overallSuccess,
      results,
      period: { from: fromISO, to: toISO },
      store_id: storeId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dashboard-sync:', error);
    return new Response(JSON.stringify({
      error: error.message,
      hint: 'Check your integration configurations'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});