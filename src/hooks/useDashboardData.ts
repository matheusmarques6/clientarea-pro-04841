import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DashboardKPIs {
  total_revenue: number;
  email_revenue: number;
  sms_revenue: number;
  whatsapp_revenue: number;
  convertfy_revenue: number;
  order_count: number;
  currency: string;
  period_start: string;
  period_end: string;
}

export interface RevenueSeriesData {
  period: string;
  total_revenue: number;
  email_revenue: number;
  order_count: number;
}

export const useDashboardData = (storeId: string) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<RevenueSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar KPIs consolidados
  const fetchKPIs = async (startDate: string, endDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('rpc_get_store_kpis', {
          _store_id: storeId,
          _start_date: startDate,
          _end_date: endDate
        });

      if (rpcError) {
        console.error('Error fetching KPIs:', rpcError);
        throw rpcError;
      }

      setKpis(data as unknown as DashboardKPIs);
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar KPIs';
      setError(errorMessage);
      console.error('Error in fetchKPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar série temporal de receita
  const fetchRevenueSeries = async (startDate: string, endDate: string, interval: string = 'day') => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('rpc_get_revenue_series', {
          _store_id: storeId,
          _start_date: startDate,
          _end_date: endDate,
          _interval: interval
        });

      if (rpcError) {
        console.error('Error fetching revenue series:', rpcError);
        throw rpcError;
      }

      setRevenueSeries(data || []);
    } catch (err: any) {
      console.error('Error in fetchRevenueSeries:', err);
      // Não mostrar erro para série temporal, pois os KPIs são mais importantes
    }
  };

  // Sincronizar dados manualmente (versão simplificada)
  const syncData = async (startDate: string, endDate: string) => {
    try {
      setSyncing(true);

      toast({
        title: "Sincronização iniciada",
        description: "Atualizando dados do dashboard...",
      });

      // Recarregar dados diretamente
      await Promise.all([
        fetchKPIs(startDate, endDate),
        fetchRevenueSeries(startDate, endDate)
      ]);

      toast({
        title: "Sincronização concluída",
        description: "Os dados foram atualizados com sucesso",
      });

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao sincronizar dados';
      toast({
        title: "Erro na sincronização",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  // Buscar logs de sincronização
  const fetchSyncLogs = async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching sync logs:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in fetchSyncLogs:', err);
      return [];
    }
  };

  // Verificar status das integrações
  const checkIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('provider, status')
        .eq('store_id', storeId)
        .in('provider', ['shopify', 'klaviyo']);

      if (error) {
        console.error('Error checking integrations:', error);
        return {};
      }

      const integrations = data.reduce((acc, integration) => {
        acc[integration.provider] = integration.status;
        return acc;
      }, {} as Record<string, string>);

      return integrations;
    } catch (err) {
      console.error('Error in checkIntegrations:', err);
      return {};
    }
  };

  // Carregar dados para o período padrão (últimos 30 dias)
  useEffect(() => {
    if (storeId) {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      Promise.all([
        fetchKPIs(startDate, endDate),
        fetchRevenueSeries(startDate, endDate)
      ]);
    }
  }, [storeId]);

  return {
    kpis,
    revenueSeries,
    loading,
    syncing,
    error,
    fetchKPIs,
    fetchRevenueSeries,
    syncData,
    fetchSyncLogs,
    checkIntegrations,
    refetch: (startDate: string, endDate: string) => {
      return Promise.all([
        fetchKPIs(startDate, endDate),
        fetchRevenueSeries(startDate, endDate)
      ]);
    }
  };
};