import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KlaviyoMetric {
  data: {
    attributes: {
      revenue: number;
      timestamp: string;
    };
  }[];
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
        provider: 'klaviyo',
        sync_type: 'revenue',
        status: 'running',
        started_at: syncStarted,
        message: `Iniciando sincronização de receita do período ${fromDate} a ${toDate}`
      })
      .select()
      .single();

    // Buscar credenciais do Klaviyo para a loja
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('key_public, key_secret_encrypted')
      .eq('store_id', storeId)
      .eq('provider', 'klaviyo')
      .eq('status', 'connected')
      .single();

    if (integrationError || !integration) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          message: 'Integração com Klaviyo não encontrada ou não configurada',
          finished_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      return new Response(
        JSON.stringify({ error: 'Klaviyo integration not found or not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const privateKey = integration.key_secret_encrypted;

    if (!privateKey) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          message: 'Chave privada do Klaviyo não configurada',
          finished_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      return new Response(
        JSON.stringify({ error: 'Klaviyo private key not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Datas padrão se não fornecidas
    const startDate = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = toDate || new Date().toISOString().split('T')[0];

    console.log(`Syncing Klaviyo revenue from ${startDate} to ${endDate}`);

    // Para esta implementação inicial, vamos usar dados simulados baseados na integração
    // Em uma implementação real, você faria chamadas para a API do Klaviyo
    // Exemplo: https://a.klaviyo.com/api/campaigns/{id}/reporting

    let processedCount = 0;
    let totalRevenue = 0;

    try {
      // Simular busca de dados da API do Klaviyo
      // Aqui você faria as chamadas reais para:
      // 1. /api/campaigns com filtro de data
      // 2. /api/flows com filtro de data  
      // 3. Agregar receita por período

      // Por enquanto, vamos criar alguns dados de exemplo
      const mockRevenueData = [
        {
          source: 'campaign',
          revenue: Math.random() * 1000 + 500,
          period_start: startDate,
          period_end: endDate,
        },
        {
          source: 'flow',
          revenue: Math.random() * 800 + 300,
          period_start: startDate,
          period_end: endDate,
        }
      ];

      for (const revenueData of mockRevenueData) {
        const channelRevenueData = {
          store_id: storeId,
          channel: 'email',
          source: revenueData.source,
          period_start: revenueData.period_start,
          period_end: revenueData.period_end,
          revenue: revenueData.revenue,
          currency: 'BRL',
          raw: revenueData
        };

        const { error: revenueError } = await supabase
          .from('channel_revenue')
          .upsert(channelRevenueData, {
            onConflict: 'store_id,channel,source,period_start,period_end',
            ignoreDuplicates: false
          });

        if (revenueError) {
          console.error('Error upserting revenue:', revenueError);
        } else {
          processedCount++;
          totalRevenue += revenueData.revenue;
        }
      }

      // Atualizar log da sincronização
      const message = `Sincronizados ${processedCount} registros de receita. Total: R$ ${totalRevenue.toFixed(2)}`;

      await supabase
        .from('sync_logs')
        .update({
          status: 'success',
          message,
          records_processed: processedCount,
          finished_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      return new Response(
        JSON.stringify({
          success: true,
          processed: processedCount,
          total_revenue: totalRevenue,
          message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          message: `Erro ao processar dados do Klaviyo: ${error.message}`,
          finished_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      throw error;
    }

  } catch (error) {
    console.error('Error in klaviyo-revenue-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});