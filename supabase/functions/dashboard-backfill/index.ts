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
    const url = new URL(req.url);
    const storeId = url.searchParams.get('storeId');
    const days = parseInt(url.searchParams.get('days') || '30');

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting backfill for store ${storeId} - ${days} days`);

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

    // Definir período de backfill
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const fromISO = startDate.toISOString();
    const toISO = endDate.toISOString();

    console.log(`Backfilling data from ${fromISO} to ${toISO}`);

    // URLs das funções de sincronização
    const baseUrl = Deno.env.get('SUPABASE_URL');
    const shopifyUrl = `${baseUrl}/functions/v1/shopify-orders-sync?storeId=${storeId}&from=${fromISO}&to=${toISO}`;
    const klaviyoUrl = `${baseUrl}/functions/v1/klaviyo-revenue-sync?storeId=${storeId}&from=${fromISO}&to=${toISO}`;

    const results = {
      shopify: { success: false, error: null as string | null, data: null as any },
      klaviyo: { success: false, error: null as string | null, data: null as any },
    };

    // Executar sincronizações em paralelo
    const promises = [];

    // Shopify backfill
    promises.push(
      fetch(shopifyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).then(async (response) => {
        if (response.ok) {
          results.shopify.data = await response.json();
          results.shopify.success = true;
          console.log('Shopify backfill completed successfully');
        } else {
          const errorData = await response.json();
          results.shopify.error = errorData.error || 'Unknown error';
          console.error('Shopify backfill failed:', results.shopify.error);
        }
      }).catch((error) => {
        results.shopify.error = error.message;
        console.error('Shopify backfill error:', error);
      })
    );

    // Klaviyo backfill
    promises.push(
      fetch(klaviyoUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).then(async (response) => {
        if (response.ok) {
          results.klaviyo.data = await response.json();
          results.klaviyo.success = true;
          console.log('Klaviyo backfill completed successfully');
        } else {
          const errorData = await response.json();
          results.klaviyo.error = errorData.error || 'Unknown error';
          console.error('Klaviyo backfill failed:', results.klaviyo.error);
        }
      }).catch((error) => {
        results.klaviyo.error = error.message;
        console.error('Klaviyo backfill error:', error);
      })
    );

    // Aguardar todas as sincronizações
    await Promise.all(promises);

    const overallSuccess = results.shopify.success || results.klaviyo.success;
    const totalProcessed = (results.shopify.data?.processed || 0) + (results.klaviyo.data?.processed || 0);

    console.log(`Backfill completed. Success: ${overallSuccess}, Total processed: ${totalProcessed}`);

    return new Response(JSON.stringify({
      success: overallSuccess,
      results,
      totalProcessed,
      period: { from: fromISO, to: toISO, days },
      store_id: storeId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dashboard-backfill:', error);
    return new Response(JSON.stringify({
      error: error.message,
      hint: 'Check your integration configurations and permissions'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});