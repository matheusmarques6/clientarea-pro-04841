import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardKPIs {
  total_revenue: number;
  email_revenue: number;
  convertfy_revenue: number;
  order_count: number;
  customers_distinct: number;
  customers_returning: number;
  currency: string;
}

interface ChartDataPoint {
  date: string;
  total: number;
  convertfy: number;
}

interface ChannelRevenue {
  channel: string;
  revenue: number;
  percentage: number;
}

export const useDashboardData = (storeId: string, period: string) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [channelRevenue, setChannelRevenue] = useState<ChannelRevenue[]>([]);
  const [klaviyoData, setKlaviyoData] = useState<any>(null);
  const [topCampaigns, setTopCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Converter período para datas
  const getPeriodDates = (period: string) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '14d':
        startDate.setDate(startDate.getDate() - 14);
        break;
      case '30d':
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }
    
    return { startDate, endDate };
  };

  // Buscar KPIs usando as novas funções RPC
  const fetchKPIs = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period);
      
      // Buscar dados em paralelo usando as novas RPC functions
      const [
        totalRevenueResult,
        emailRevenueResult,
        customersDistinctResult,
        customersReturningResult,
        storeResult
      ] = await Promise.all([
        supabase.rpc('kpi_total_revenue', {
          p_store: storeId,
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
        }),
        supabase.rpc('kpi_email_revenue', {
          p_store: storeId,
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
        }),
        supabase.rpc('kpi_customers_distinct', {
          p_store: storeId,
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
        }),
        supabase.rpc('kpi_customers_returning', {
          p_store: storeId,
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString(),
        }),
        supabase
          .from('stores')
          .select('currency')
          .eq('id', storeId)
          .maybeSingle()
      ]);

      if (totalRevenueResult.error) {
        console.error('Error fetching total revenue:', totalRevenueResult.error);
        return;
      }

      if (emailRevenueResult.error) {
        console.error('Error fetching email revenue:', emailRevenueResult.error);
        return;
      }

      if (customersDistinctResult.error) {
        console.error('Error fetching distinct customers:', customersDistinctResult.error);
        return;
      }

      if (customersReturningResult.error) {
        console.error('Error fetching returning customers:', customersReturningResult.error);
        return;
      }

      const totalRevenue = totalRevenueResult.data || 0;
      const emailRevenue = emailRevenueResult.data || 0;
      const customersDistinct = customersDistinctResult.data || 0;
      const customersReturning = customersReturningResult.data || 0;
      const currency = storeResult.data?.currency || 'BRL';

      // Buscar contagem de pedidos no período
      const { data: orderCountResult } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());

      const orderCount = orderCountResult ? 0 : 0; // count is in the count property

      setKpis({
        total_revenue: Number(totalRevenue),
        email_revenue: klaviyoData?.revenue_total || Number(emailRevenue),
        convertfy_revenue: klaviyoData?.revenue_total || Number(emailRevenue),
        order_count: orderCount,
        customers_distinct: Number(customersDistinct),
        customers_returning: Number(customersReturning),
        currency: currency,
      });
    } catch (error) {
      console.error('Error in fetchKPIs:', error);
    }
  };

  // Buscar série temporal para gráficos
  const fetchRevenueSeries = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period);
      
      const { data, error } = await supabase.rpc('rpc_get_revenue_series', {
        _store_id: storeId,
        _start_date: startDate.toISOString(),
        _end_date: endDate.toISOString(),
        _interval: 'day'
      });

      if (error) {
        console.error('Error fetching revenue series:', error);
        return;
      }

      if (data) {
        const formattedData = data.map((item: any) => ({
          date: new Date(item.period).toISOString().split('T')[0],
          total: Number(item.total_revenue) || 0,
          convertfy: Number(item.email_revenue) || 0,
        }));
        
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error in fetchRevenueSeries:', error);
    }
  };

  // Buscar receita por canal
  const fetchChannelRevenue = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period);
      
      const { data, error } = await supabase
        .from('channel_revenue')
        .select('channel, revenue')
        .eq('store_id', storeId)
        .gte('period_start', startDate.toISOString().split('T')[0])
        .lte('period_end', endDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching channel revenue:', error);
        return;
      }

      if (data) {
        // Agregar por canal
        const channelMap = new Map<string, number>();
        data.forEach(item => {
          const current = channelMap.get(item.channel) || 0;
          channelMap.set(item.channel, current + Number(item.revenue));
        });

        const total = Array.from(channelMap.values()).reduce((sum, val) => sum + val, 0);
        
        const formattedData = Array.from(channelMap.entries()).map(([channel, revenue]) => ({
          channel: channel === 'email' ? 'E-mail' : channel === 'sms' ? 'SMS' : 'WhatsApp',
          revenue,
          percentage: total > 0 ? Math.round((revenue / total) * 100) : 0,
        }));
        
        setChannelRevenue(formattedData);
      }
    } catch (error) {
      console.error('Error in fetchChannelRevenue:', error);
    }
  };

  // Buscar dados do Klaviyo via webhook n8n
  const fetchKlaviyoData = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period);
      
      // Tentar buscar via webhook n8n primeiro
      try {
        const { getKlaviyoSummary } = await import('@/api/klaviyo');
        
        const fromISO = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0)).toISOString();
        const toISO = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59)).toISOString();
        
        const data = await getKlaviyoSummary(storeId, fromISO, toISO);

        if (data?.klaviyo) {
          setKlaviyoData(data.klaviyo);
          setTopCampaigns(Array.isArray(data.klaviyo.top_campaigns_by_revenue) ? data.klaviyo.top_campaigns_by_revenue : []);
          console.log('Using real Klaviyo data from n8n webhook');
          return;
        }
        
        console.log('Klaviyo webhook: no data returned');
      } catch (webhookError) {
        console.log('Klaviyo webhook failed:', webhookError);
      }

      // Fallback: buscar do cache no banco
      const { data: cache, error: cacheError } = await supabase
        .from('klaviyo_summaries')
        .select('*')
        .eq('store_id', storeId)
        .eq('period_start', startDate.toISOString().split('T')[0])
        .eq('period_end', endDate.toISOString().split('T')[0])
        .maybeSingle();

      if (cache && !cacheError) {
        const klaviyoFromCache = {
          revenue_total: Number(cache.revenue_total),
          revenue_campaigns: Number(cache.revenue_campaigns),
          revenue_flows: Number(cache.revenue_flows),
          orders_attributed: cache.orders_attributed,
          top_campaigns_by_revenue: cache.top_campaigns_by_revenue || [],
          top_campaigns_by_conversions: cache.top_campaigns_by_conversions || [],
          leads_total: cache.leads_total
        };
        
        setKlaviyoData(klaviyoFromCache);
        setTopCampaigns(Array.isArray(klaviyoFromCache.top_campaigns_by_revenue) ? klaviyoFromCache.top_campaigns_by_revenue : []);
        console.log('Using cached Klaviyo data');
      } else {
        console.log('No Klaviyo data available (cache miss)');
        setKlaviyoData(null);
        setTopCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching Klaviyo data:', error);
      setKlaviyoData(null);
      setTopCampaigns([]);
    }
  };

  const syncData = async () => {
    setIsSyncing(true);
    
    try {
      const { startDate, endDate } = getPeriodDates(period);
      const fromISO = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0)).toISOString();
      const toISO = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59)).toISOString();
      
      let shopifySuccess = false;
      let klaviyoSuccess = false;
      let messages: string[] = [];

      // 1. Sincronizar Shopify
      try {
        const { data: shopifyData, error: shopifyError } = await supabase.functions.invoke('shopify_orders_sync', {
          method: 'POST',
          body: { 
            storeId, 
            from: startDate.toISOString(), 
            to: endDate.toISOString() 
          }
        });

        if (shopifyError) {
          console.error('Erro Shopify:', shopifyError);
          messages.push(`Shopify: ${shopifyError.message}`);
        } else {
          shopifySuccess = true;
          messages.push(`Shopify: ${shopifyData?.synced || 0} pedidos sincronizados`);
        }
      } catch (shopifyErr) {
        console.error('Erro Shopify catch:', shopifyErr);
        messages.push(`Shopify: Erro na sincronização`);
      }

      // 2. SEMPRE disparar webhook Klaviyo
      console.log('Disparando webhook Klaviyo...');
      
      try {
        const { data: klaviyoData, error: klaviyoError } = await supabase.functions.invoke('n8n_klaviyo_sync', {
          method: 'POST',
          body: {
            storeId,
            from: fromISO,
            to: toISO
          }
        });

        if (klaviyoError) {
          console.error('Erro Klaviyo:', klaviyoError);
          messages.push(`Klaviyo: ${klaviyoError.message}`);
        } else if (klaviyoData?.success && klaviyoData?.data?.klaviyo) {
          klaviyoSuccess = true;
          
          // Atualizar dados do Klaviyo
          setKlaviyoData(klaviyoData.data.klaviyo);
          setTopCampaigns(Array.isArray(klaviyoData.data.klaviyo.top_campaigns_by_revenue) ? klaviyoData.data.klaviyo.top_campaigns_by_revenue : []);
          
          const revenue = klaviyoData.data.klaviyo.revenue_total || 0;
          messages.push(`Klaviyo: Receita R$ ${revenue.toLocaleString('pt-BR')}`);
        } else {
          messages.push('Klaviyo: Sem dados retornados');
        }
      } catch (klaviyoErr) {
        console.error('Erro Klaviyo catch:', klaviyoErr);
        messages.push(`Klaviyo: Erro na comunicação`);
      }

      // 3. Recarregar dados sempre
      await Promise.all([fetchKPIs(), fetchRevenueSeries(), fetchChannelRevenue()]);

      // 4. Mostrar resultado final
      const title = (shopifySuccess && klaviyoSuccess) ? "Sincronização completa" : 
                    (shopifySuccess || klaviyoSuccess) ? "Sincronização parcial" : 
                    "Erro na sincronização";
      
      const variant = (shopifySuccess && klaviyoSuccess) ? undefined : 
                      (shopifySuccess || klaviyoSuccess) ? undefined : 
                      "destructive";

      toast({
        title,
        description: messages.join(' | '),
        variant,
      });
      
    } catch (error: any) {
      console.error('Erro geral sync:', error);
      
      toast({
        title: "Erro na sincronização",
        description: error.message || "Não foi possível sincronizar os dados",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Carregar dados iniciais
  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchKPIs(), fetchRevenueSeries(), fetchChannelRevenue(), fetchKlaviyoData()]);
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para carregar dados quando o período muda
  useEffect(() => {
    if (storeId) {
      loadData();
    }
  }, [storeId, period]);

  return {
    kpis,
    chartData,
    channelRevenue,
    klaviyoData,
    topCampaigns,
    isLoading,
    isSyncing,
    syncData,
    refetch: loadData,
  };
};