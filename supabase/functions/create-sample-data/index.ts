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

    console.log(`Creating sample data for store ${storeId}`);

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

    // Gerar dados de exemplo para os últimos 30 dias
    const results = {
      orders: { success: false, error: null as string | null, processed: 0 },
      revenue: { success: false, error: null as string | null, processed: 0 },
    };

    try {
      // Criar pedidos de exemplo
      const sampleOrders = [];
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const orderDate = new Date(today);
        orderDate.setDate(orderDate.getDate() - i);
        
        // Gerar 2-5 pedidos por dia
        const ordersPerDay = Math.floor(Math.random() * 4) + 2;
        
        for (let j = 0; j < ordersPerDay; j++) {
          const orderValue = (Math.random() * 500) + 50; // Entre R$50 e R$550
          
          sampleOrders.push({
            store_id: storeId,
            shopify_id: Date.now() + Math.random() * 1000000, // ID único simulado
            code: `#${1000 + sampleOrders.length}`,
            total: orderValue,
            currency: 'BRL',
            created_at: orderDate.toISOString(),
            status: 'paid',
            raw: { sample: true },
          });
        }
      }

      // Inserir pedidos de exemplo
      const { error: ordersError } = await supabase
        .from('orders')
        .upsert(sampleOrders, {
          onConflict: 'shopify_id',
          ignoreDuplicates: false
        });

      if (ordersError) {
        results.orders.error = ordersError.message;
        console.error('Error inserting sample orders:', ordersError);
      } else {
        results.orders.success = true;
        results.orders.processed = sampleOrders.length;
        console.log(`Inserted ${sampleOrders.length} sample orders`);
      }
    } catch (error) {
      results.orders.error = error.message;
      console.error('Error creating sample orders:', error);
    }

    try {
      // Criar receita de email de exemplo
      const sampleRevenue = [];
      const today = new Date();
      
      for (let i = 0; i < 4; i++) { // 4 semanas
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        // Receita de campanhas
        sampleRevenue.push({
          store_id: storeId,
          channel: 'email',
          source: 'campaign',
          period_start: weekStart.toISOString().split('T')[0],
          period_end: weekEnd.toISOString().split('T')[0],
          revenue: (Math.random() * 3000) + 1000, // Entre R$1000 e R$4000
          currency: 'BRL',
          raw: { sample: true },
        });

        // Receita de flows
        sampleRevenue.push({
          store_id: storeId,
          channel: 'email',
          source: 'flow',
          period_start: weekStart.toISOString().split('T')[0],
          period_end: weekEnd.toISOString().split('T')[0],
          revenue: (Math.random() * 2000) + 500, // Entre R$500 e R$2500
          currency: 'BRL',
          raw: { sample: true },
        });
      }

      // Inserir receita de exemplo
      const { error: revenueError } = await supabase
        .from('channel_revenue')
        .upsert(sampleRevenue, {
          onConflict: 'store_id,channel,source,period_start,period_end',
          ignoreDuplicates: false
        });

      if (revenueError) {
        results.revenue.error = revenueError.message;
        console.error('Error inserting sample revenue:', revenueError);
      } else {
        results.revenue.success = true;
        results.revenue.processed = sampleRevenue.length;
        console.log(`Inserted ${sampleRevenue.length} sample revenue records`);
      }
    } catch (error) {
      results.revenue.error = error.message;
      console.error('Error creating sample revenue:', error);
    }

    const overallSuccess = results.orders.success || results.revenue.success;

    return new Response(JSON.stringify({
      success: overallSuccess,
      message: 'Sample data created for testing dashboard',
      results,
      store_id: storeId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-sample-data:', error);
    return new Response(JSON.stringify({
      error: error.message,
      hint: 'Failed to create sample data'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});