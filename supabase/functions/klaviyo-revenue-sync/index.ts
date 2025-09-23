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
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting Klaviyo sync for store ${storeId}`);

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

    // Buscar credenciais do Klaviyo
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('store_id', storeId)
      .eq('provider', 'klaviyo')
      .eq('status', 'connected')
      .single();

    if (!integration) {
      return new Response(JSON.stringify({ 
        error: 'Klaviyo integration not found or not connected',
        hint: 'Please configure Klaviyo integration first'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const privateKey = integration.key_secret_encrypted; // Em produção, descriptografar

    if (!privateKey) {
      throw new Error('Missing Klaviyo private key');
    }

    // Simular dados de receita por enquanto (substituir por API real do Klaviyo)
    const mockEmailRevenue = [
      {
        source: 'campaign',
        revenue: Math.random() * 5000,
        period_start: fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: toDate || new Date().toISOString().split('T')[0],
      },
      {
        source: 'flow',
        revenue: Math.random() * 3000,
        period_start: fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: toDate || new Date().toISOString().split('T')[0],
      }
    ];

    console.log(`Processing ${mockEmailRevenue.length} revenue records`);

    // Processar e inserir receita
    const processedRevenue = [];
    
    for (const revenue of mockEmailRevenue) {
      try {
        const revenueData = {
          store_id: storeId,
          channel: 'email',
          source: revenue.source,
          period_start: revenue.period_start,
          period_end: revenue.period_end,
          revenue: revenue.revenue,
          currency: 'BRL',
          raw: revenue,
        };

        // Upsert revenue
        const { error: upsertError } = await supabase
          .from('channel_revenue')
          .upsert(revenueData, {
            onConflict: 'store_id,channel,source,period_start,period_end',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error upserting revenue:', upsertError);
          continue;
        }

        processedRevenue.push(revenueData);
      } catch (error) {
        console.error('Error processing revenue:', error);
        continue;
      }
    }

    console.log(`Successfully processed ${processedRevenue.length} revenue records`);

    return new Response(JSON.stringify({
      success: true,
      processed: processedRevenue.length,
      total: mockEmailRevenue.length,
      total_revenue: processedRevenue.reduce((sum, r) => sum + r.revenue, 0),
      period: { from: fromDate, to: toDate },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in klaviyo-revenue-sync:', error);
    return new Response(JSON.stringify({
      error: error.message,
      hint: 'Check your Klaviyo integration configuration'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});