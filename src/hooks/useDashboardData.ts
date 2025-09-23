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
        email_revenue: Number(emailRevenue),
        convertfy_revenue: Number(emailRevenue), // Por enquanto só email
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

  const syncData = async () => {
    setIsSyncing(true);
    
    try {
      const { startDate, endDate } = getPeriodDates(period);
      
      // ✅ Usar supabase.functions.invoke em vez de fetch manual
      const { data, error } = await supabase.functions.invoke('shopify_orders_sync', {
        method: 'POST',
        body: { 
          storeId, 
          from: startDate.toISOString(), 
          to: endDate.toISOString() 
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro na sincronização');
      }

      if (data?.synced !== undefined) {
        toast({
          title: "Sucesso",
          description: `${data.synced} pedidos sincronizados. Receita total: ${data.totalRevenue} ${data.currency}`,
        });
        
        // Recarregar dados após sincronização
        await Promise.all([fetchKPIs(), fetchRevenueSeries(), fetchChannelRevenue()]);
      } else {
        throw new Error(data?.error || 'Erro na sincronização');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      
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
      await Promise.all([fetchKPIs(), fetchRevenueSeries(), fetchChannelRevenue()]);
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
    isLoading,
    isSyncing,
    syncData,
    refetch: loadData,
  };
};