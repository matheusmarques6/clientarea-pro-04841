import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { KlaviyoSummary } from '@/api/klaviyo';

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

interface StoreKpiResponse {
  total_revenue: number | null;
  email_revenue: number | null;
  convertfy_revenue: number | null;
  order_count: number | null;
  currency: string | null;
}

interface RevenueSeriesRow {
  period: string;
  total_revenue: number | null;
  email_revenue: number | null;
}

export const useDashboardData = (storeId: string, period: string) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [channelRevenue, setChannelRevenue] = useState<ChannelRevenue[]>([]);
  const [klaviyoData, setKlaviyoData] = useState<KlaviyoSummary['klaviyo'] | null>(null);
  const [topCampaigns, setTopCampaigns] = useState<KlaviyoSummary['klaviyo']['top_campaigns_by_revenue']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const kpiBaseRef = useRef<DashboardKPIs | null>(null);

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

  const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  };

  type EdgeFunctionResult<T> = { data: T | null; error: { message?: string } | null };

  const invokeEdgeFunction = async <T>(
    name: string,
    body: Record<string, unknown>,
    timeoutMs = 20000
  ): Promise<T | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error('No authentication token available');
    }

    const result = await withTimeout(
      supabase.functions.invoke<T>(name, {
        body,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }) as Promise<EdgeFunctionResult<T>>,
      timeoutMs
    );

    if (result?.error) {
      const errorMessage = result.error.message || 'Edge function error';
      throw new Error(errorMessage);
    }

    return result?.data ?? null;
  };

  const applyKpis = (klaviyoRevenue?: number | null) => {
    if (!kpiBaseRef.current) {
      return;
    }

    const hasKlaviyoRevenue = typeof klaviyoRevenue === 'number' && !Number.isNaN(klaviyoRevenue);

    setKpis({
      ...kpiBaseRef.current,
      email_revenue: hasKlaviyoRevenue ? klaviyoRevenue : kpiBaseRef.current.email_revenue,
      convertfy_revenue: hasKlaviyoRevenue ? klaviyoRevenue : kpiBaseRef.current.convertfy_revenue,
    });
  };

  const updateKlaviyoState = (klaviyo: KlaviyoSummary['klaviyo'] | null) => {
    if (klaviyo) {
      setKlaviyoData(klaviyo);
      setTopCampaigns(Array.isArray(klaviyo.top_campaigns_by_revenue) ? klaviyo.top_campaigns_by_revenue : []);
      applyKpis(klaviyo.revenue_total ?? null);
    } else {
      setKlaviyoData(null);
      setTopCampaigns([]);
      applyKpis(null);
    }
  };

  const formatToastCurrency = (value: number) => {
    const currency = kpiBaseRef.current?.currency || 'BRL';
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
    } catch {
      return `R$ ${value.toLocaleString('pt-BR')}`;
    }
  };

  // Buscar KPIs usando as novas funções RPC
  const fetchKPIs = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period);

      // Buscar dados em paralelo usando as novas RPC functions
      const [kpiResult, customersDistinctResult, customersReturningResult] = await Promise.all([
        supabase.rpc('rpc_get_store_kpis', {
          _store_id: storeId,
          _start_date: startDate.toISOString(),
          _end_date: endDate.toISOString(),
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
        })
      ]);

      if (kpiResult.error) {
        console.error('Error fetching KPI summary:', kpiResult.error);
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

      const kpiData = (kpiResult.data as StoreKpiResponse | null) ?? null;
      const baseKpis: DashboardKPIs = {
        total_revenue: Number(kpiData?.total_revenue ?? 0),
        email_revenue: Number(kpiData?.email_revenue ?? 0),
        convertfy_revenue: Number(kpiData?.convertfy_revenue ?? 0),
        order_count: Number(kpiData?.order_count ?? 0),
        customers_distinct: Number(customersDistinctResult.data ?? 0),
        customers_returning: Number(customersReturningResult.data ?? 0),
        currency: kpiData?.currency ?? 'BRL',
      };

      kpiBaseRef.current = baseKpis;
      applyKpis(klaviyoData?.revenue_total ?? null);
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
        const formattedData = (data as RevenueSeriesRow[]).map((item) => ({
          date: new Date(item.period).toISOString().split('T')[0],
          total: Number(item.total_revenue ?? 0),
          convertfy: Number(item.email_revenue ?? 0),
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
      
      // Usar a nova Edge Function klaviyo_summary
      try {
        const fromDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const toDate = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

        const data = await invokeEdgeFunction<KlaviyoSummary>('klaviyo_summary', {
          storeId,
          from: fromDate,
          to: toDate,
          fast: true,
        });

        if (data?.klaviyo) {
          updateKlaviyoState(data.klaviyo);
          console.log('Using real Klaviyo data from Edge Function');
          return;
        }

        console.log('Klaviyo Edge Function: no data returned');
      } catch (functionError) {
        console.log('Klaviyo Edge Function failed:', functionError);
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
        const klaviyoFromCache: KlaviyoSummary['klaviyo'] = {
          revenue_total: Number(cache.revenue_total) || 0,
          revenue_campaigns: Number(cache.revenue_campaigns) || 0,
          revenue_flows: Number(cache.revenue_flows) || 0,
          orders_attributed: Number(cache.orders_attributed) || 0,
          top_campaigns_by_revenue: Array.isArray(cache.top_campaigns_by_revenue) ? cache.top_campaigns_by_revenue : [],
          top_campaigns_by_conversions: Array.isArray(cache.top_campaigns_by_conversions) ? cache.top_campaigns_by_conversions : [],
          leads_total: Number(cache.leads_total) || 0,
        };

        updateKlaviyoState(klaviyoFromCache);
        console.log('Using cached Klaviyo data');
      } else {
        console.log('No Klaviyo data available (cache miss)');
        updateKlaviyoState(null);
      }
    } catch (error) {
      console.error('Error fetching Klaviyo data:', error);
      updateKlaviyoState(null);
    }
  };

  const syncData = async () => {
    setIsSyncing(true);

    try {
      const { startDate, endDate } = getPeriodDates(period);

      let shopifySuccess = false;
      let klaviyoSuccess = false;
      const messages: string[] = [];

      // 1. Sincronizar Shopify
      try {
        const shopifyData = await invokeEdgeFunction<{ synced?: number; totalRevenue?: number }>(
          'shopify_orders_sync',
          {
            storeId,
            from: startDate.toISOString().split('T')[0],
            to: endDate.toISOString().split('T')[0],
          },
          15000
        );

        if (shopifyData) {
          shopifySuccess = true;
          messages.push(`Shopify: ${shopifyData.synced || 0} pedidos sincronizados`);
        } else {
          messages.push('Shopify: Nenhum dado retornado');
        }
      } catch (shopifyErr) {
        console.error('Erro Shopify catch:', shopifyErr);
        const errorMessage = shopifyErr instanceof Error ? shopifyErr.message : 'Erro na sincronização';
        messages.push(`Shopify: ${errorMessage}`);
      }

      // 2. Sincronizar Klaviyo
      console.log('Sincronizando Klaviyo...');

      try {
        const klaviyoResult = await invokeEdgeFunction<KlaviyoSummary>(
          'klaviyo_summary',
          {
            storeId,
            from: startDate.toISOString().split('T')[0],
            to: endDate.toISOString().split('T')[0],
            fast: true,
          },
          15000
        );

        if (klaviyoResult?.klaviyo) {
          klaviyoSuccess = true;
          updateKlaviyoState(klaviyoResult.klaviyo);

          const revenue = klaviyoResult.klaviyo.revenue_total || 0;
          messages.push(`Klaviyo: Receita ${formatToastCurrency(revenue)}`);
        } else {
          messages.push('Klaviyo: Sem dados retornados');
        }
      } catch (klaviyoErr) {
        console.error('Erro Klaviyo catch:', klaviyoErr);
        const errorMessage = klaviyoErr instanceof Error ? klaviyoErr.message : 'Erro na comunicação';
        messages.push(`Klaviyo: ${errorMessage}`);
      }

      // 3. Recarregar dados sempre
      await Promise.all([fetchKPIs(), fetchRevenueSeries(), fetchChannelRevenue()]);

      if (!klaviyoSuccess) {
        await fetchKlaviyoData();
      }

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
      
    } catch (error) {
      console.error('Erro geral sync:', error);

      const errorMessage = error instanceof Error ? error.message : 'Não foi possível sincronizar os dados';

      toast({
        title: "Erro na sincronização",
        description: errorMessage,
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