import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardKPIs {
  total_revenue: number;
  email_revenue: number;
  sms_revenue: number;
  whatsapp_revenue: number;
  order_count: number;
  currency: string;
  convertfy_revenue: number;
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

  // Buscar KPIs
  const fetchKPIs = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period);
      
      const { data, error } = await supabase.rpc('rpc_get_store_kpis', {
        _store_id: storeId,
        _start_date: startDate.toISOString(),
        _end_date: endDate.toISOString(),
      });

      if (error) {
        console.error('Error fetching KPIs:', error);
        return;
      }

      if (data) {
        setKpis(data as unknown as DashboardKPIs);
      }
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
      const { data, error } = await supabase.functions.invoke('dashboard-sync', {
        body: JSON.stringify({ storeId }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Sucesso",
          description: "Dados sincronizados com sucesso!",
        });
        
        // Recarregar dados após sincronização
        await Promise.all([fetchKPIs(), fetchRevenueSeries(), fetchChannelRevenue()]);
      } else {
        throw new Error(data?.error || 'Erro na sincronização');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      
      // Se for erro de função não encontrada, tentar alternativa
      if (error.message?.includes('function not found') || error.message?.includes('not found')) {
        toast({
          title: "Funcionalidade em desenvolvimento",
          description: "A sincronização automática ainda não está disponível. Use dados mock por enquanto.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro na sincronização",
          description: error.message || "Não foi possível sincronizar os dados",
          variant: "destructive",
        });
      }
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