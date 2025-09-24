import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { KlaviyoSummary, KlaviyoWebhookResponse, Campaign } from '@/api/klaviyo';
import { toast as sonnerToast } from 'sonner';

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
  const [topCampaigns, setTopCampaigns] = useState<{
    byRevenue: Campaign[];
    byConversions: Campaign[];
  }>({ byRevenue: [], byConversions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
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
      timeoutHandle = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
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

  const updateKlaviyoState = (data: KlaviyoWebhookResponse | KlaviyoSummary['klaviyo'] | null) => {
    if (!data) {
      setKlaviyoData(null);
      setTopCampaigns({ byRevenue: [], byConversions: [] });
      applyKpis(null);
      return;
    }
    
    // Handle new webhook response format
    if ('klaviyo' in data) {
      const webhookData = data as KlaviyoWebhookResponse;
      const klaviyoData = {
        revenue_total: webhookData.klaviyo.revenue_total,
        revenue_campaigns: webhookData.klaviyo.revenue_campaigns,
        revenue_flows: webhookData.klaviyo.revenue_flows,
        orders_attributed: webhookData.klaviyo.orders_attributed,
        conversions_campaigns: webhookData.klaviyo.conversions_campaigns,
        conversions_flows: webhookData.klaviyo.conversions_flows,
        leads_total: typeof webhookData.klaviyo.leads_total === 'string' 
          ? parseInt(webhookData.klaviyo.leads_total.replace('+', '')) || 0
          : webhookData.klaviyo.leads_total,
        top_campaigns_by_revenue: webhookData.klaviyo.top_campaigns_by_revenue || [],
        top_campaigns_by_conversions: webhookData.klaviyo.top_campaigns_by_conversions || []
      };
      
      setKlaviyoData(klaviyoData);
      setTopCampaigns({
        byRevenue: webhookData.klaviyo.top_campaigns_by_revenue || [],
        byConversions: webhookData.klaviyo.top_campaigns_by_conversions || []
      });
      
      // Somar revenue_campaigns + revenue_flows para o faturamento Convertfy
      const convertfyRevenue = (webhookData.klaviyo.revenue_campaigns || 0) + (webhookData.klaviyo.revenue_flows || 0);
      applyKpis(convertfyRevenue);
    } else {
      // Handle legacy format
      const klaviyoData = data as KlaviyoSummary['klaviyo'];
      setKlaviyoData({
        ...klaviyoData,
        conversions_campaigns: klaviyoData.conversions_campaigns || 0,
        conversions_flows: klaviyoData.conversions_flows || 0
      });
      setTopCampaigns({
        byRevenue: klaviyoData.top_campaigns_by_revenue || [],
        byConversions: klaviyoData.top_campaigns_by_conversions || []
      });
      applyKpis(klaviyoData.revenue_total ?? null);
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

      const kpiData = (kpiResult.data as unknown as StoreKpiResponse | null) ?? null;
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

  // Buscar dados do Klaviyo para o período específico da loja
  const fetchKlaviyoData = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period);
      const periodStart = startDate.toISOString().split('T')[0];
      const periodEnd = endDate.toISOString().split('T')[0];

      console.log(`Fetching Klaviyo data for store ${storeId}, period ${period} (${periodStart} to ${periodEnd})`);

      // Buscar dados específicos para este período e loja
      const { data: cache, error: cacheError } = await supabase
        .from('klaviyo_summaries')
        .select('*')
        .eq('store_id', storeId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cache && !cacheError) {
        const klaviyoFromCache: KlaviyoSummary['klaviyo'] = {
          revenue_total: Number(cache.revenue_total) || 0,
          revenue_campaigns: Number(cache.revenue_campaigns) || 0,
          revenue_flows: Number(cache.revenue_flows) || 0,
          orders_attributed: Number(cache.orders_attributed) || 0,
          conversions_campaigns: Number(cache.conversions_campaigns) || 0,
          conversions_flows: Number(cache.conversions_flows) || 0,
          top_campaigns_by_revenue: Array.isArray(cache.top_campaigns_by_revenue) ? cache.top_campaigns_by_revenue as { id: string; name: string; revenue: number; conversions: number; send_time?: string; status?: string; }[] : [],
          top_campaigns_by_conversions: Array.isArray(cache.top_campaigns_by_conversions) ? cache.top_campaigns_by_conversions as { id: string; name: string; revenue: number; conversions: number; send_time?: string; status?: string; }[] : [],
          leads_total: Number(cache.leads_total) || 0,
        };

        updateKlaviyoState(klaviyoFromCache);
        console.log(`[${period}] Klaviyo data loaded for store ${storeId}:`, {
          revenue_total: klaviyoFromCache.revenue_total,
          revenue_campaigns: klaviyoFromCache.revenue_campaigns,
          revenue_flows: klaviyoFromCache.revenue_flows,
          conversions_campaigns: klaviyoFromCache.conversions_campaigns,
          conversions_flows: klaviyoFromCache.conversions_flows,
          data_age: new Date(cache.created_at).toLocaleString()
        });
        
        // Show notification if data is very recent (less than 10 minutes old)
        const dataAge = Date.now() - new Date(cache.created_at).getTime();
        if (dataAge < 10 * 60 * 1000) { // 10 minutes
          console.log(`[${period}] Fresh data detected for store ${storeId}, age:`, Math.round(dataAge / 60000), 'minutes');
        }
      } else {
        console.log(`[${period}] No Klaviyo data available for store ${storeId} (${periodStart} to ${periodEnd})`);
        updateKlaviyoState(null);
      }
    } catch (error) {
      console.error(`[${period}] Error fetching Klaviyo data for store ${storeId}:`, error);
      updateKlaviyoState(null);
    }
  };

  const syncData = useCallback(async () => {
    if (!storeId || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const { startDate, endDate } = getPeriodDates(period);
      const periodStart = startDate.toISOString().split('T')[0];
      const periodEnd = endDate.toISOString().split('T')[0];
      
      console.log(`[${period}] Starting sync for store: ${storeId}, period: ${periodStart} to ${periodEnd}`);
      
      // Clean up stuck jobs mais agressivamente - qualquer job mais antigo que 30 minutos
      const currentTime = new Date();
      const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000);
      
      // Primeiro, limpar qualquer job travado para esta loja independente do período (mais de 30min)
      const { data: allStuckJobs } = await supabase
        .from('n8n_jobs')
        .select('id, status, started_at, period_start, period_end, request_id')
        .eq('store_id', storeId)
        .in('status', ['QUEUED', 'PROCESSING'])
        .lt('started_at', thirtyMinutesAgo.toISOString());
      
      if (allStuckJobs && allStuckJobs.length > 0) {
        console.log(`[${period}] Found stuck jobs older than 30min, cleaning up:`, allStuckJobs);
        await supabase
          .from('n8n_jobs')
          .update({ 
            status: 'ERROR', 
            error: 'Job timeout - cleaned up (30min+ old)',
            finished_at: new Date().toISOString()
          })
          .in('id', allStuckJobs.map(job => job.id));
        
        console.log(`[${period}] Cleaned up ${allStuckJobs.length} stuck jobs`);
      }
      
      // Verificação dupla - limpar qualquer job para este período específico que ainda esteja travado (10min+)
      const tenMinutesAgo = new Date(currentTime.getTime() - 10 * 60 * 1000);
      
      const { data: specificStuckJobs } = await supabase
        .from('n8n_jobs')
        .select('id, status, started_at')
        .eq('store_id', storeId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .in('status', ['QUEUED', 'PROCESSING'])
        .lt('started_at', tenMinutesAgo.toISOString());
      
      if (specificStuckJobs && specificStuckJobs.length > 0) {
        console.log(`[${period}] Found stuck jobs for this specific period, force cleaning:`, specificStuckJobs);
        await supabase
          .from('n8n_jobs')
          .update({ 
            status: 'ERROR', 
            error: 'Job timeout - force cleaned for new sync',
            finished_at: new Date().toISOString()
          })
          .in('id', specificStuckJobs.map(job => job.id));
      }
      
      // Iniciar o job específico para este período
      console.log(`[${period}] Triggering webhook for store ${storeId}, period ${periodStart} to ${periodEnd}`);
      
      const { data, error } = await supabase.functions.invoke('start_klaviyo_job', {
        body: {
          store_id: storeId,
          period_start: periodStart,
          period_end: periodEnd
        }
      });

      console.log(`[${period}] Sync response:`, { data, error });

      if (error) {
        console.error(`[${period}] Sync error details:`, error);
        if (error.message === 'Klaviyo credentials not configured') {
          throw new Error('Configure as credenciais do Klaviyo (API key e Site ID) para sincronizar os dados');
        }
        if (error.message === 'Store credentials not configured') {
          throw new Error('Configure as credenciais do Shopify e Klaviyo para sincronizar os dados');
        }
        throw error;
      }

      if (data?.job_id) {
        setSyncJobId(data.job_id);
        console.log(`[${period}] Job created with ID: ${data.job_id} for store ${storeId}`);
      }
      
      sonnerToast.success(`Sincronização ${period} iniciada para a loja. Dados específicos do período ${period} serão processados.`);
      
      // Start lightweight polling for job status updates (independent of user presence)
      if (data?.request_id) {
        checkJobStatusOnce(data.request_id);
      }
      
    } catch (error: any) {
      console.error(`[${period}] Sync failed for store ${storeId}:`, error);
      if (error.message === 'Klaviyo credentials not configured') {
        sonnerToast.error('Configure as credenciais do Klaviyo (API key e Site ID) para sincronizar os dados');
      } else if (error.message === 'Store credentials not configured') {
        sonnerToast.error('Configure as credenciais do Shopify e Klaviyo para sincronizar os dados');
      } else {
        sonnerToast.error(`Erro ao iniciar sincronização ${period}: ${error.message}`);
      }
      setIsSyncing(false);
    }
  }, [storeId, period, isSyncing]);

  // Check job status once without continuous polling
  const checkJobStatusOnce = useCallback(async (requestId: string) => {
    try {
      const { data: job } = await supabase
        .from('n8n_jobs')
        .select('status, finished_at, error, request_id')
        .eq('request_id', requestId)
        .single();

      if (!job) {
        console.log('Job not found for request_id:', requestId);
        setIsSyncing(false);
        return;
      }

      if (job.status === 'SUCCESS') {
        // Job completed, data should be available via realtime
        setIsSyncing(false);
        setSyncJobId(null);
        return;
      }

      if (job.status === 'ERROR') {
        sonnerToast.error(`Erro na sincronização: ${job.error || 'Erro desconhecido'}`);
        setIsSyncing(false);
        setSyncJobId(null);
        return;
      }

      // Job still processing - let realtime handle updates
      console.log('Job still processing, realtime will handle updates');
      
    } catch (error) {
      console.error('Error checking job status:', error);
      setIsSyncing(false);
    }
  }, []);

  // Remove the old pollJobStatus function and replace with the above
  const pollJobStatus = useCallback(async (requestId: string, periodStart: string, periodEnd: string) => {
    // Deprecated - using realtime updates instead
    checkJobStatusOnce(requestId);
  }, [checkJobStatusOnce]);

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchKPIs(), fetchRevenueSeries(), fetchChannelRevenue(), fetchKlaviyoData()]);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, period]);

  // Setup realtime subscription for automatic updates
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'klaviyo_summaries',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          // Verificar se a atualização é para o período atual
          const { startDate, endDate } = getPeriodDates(period);
          const periodStart = startDate.toISOString().split('T')[0];
          const periodEnd = endDate.toISOString().split('T')[0];
          
          const updatedData = payload.new;
          
          if (updatedData && 
              (updatedData as any).period_start === periodStart && 
              (updatedData as any).period_end === periodEnd) {
            console.log(`[${period}] Klaviyo data updated for store ${storeId}:`, updatedData);
            // Automatically fetch new data when klaviyo_summaries is updated for this specific period
            fetchKlaviyoData();
            sonnerToast.success(`Dados ${period} atualizados automaticamente para a loja!`);
          } else {
            console.log(`[${period}] Klaviyo data updated for different period, ignoring:`, {
              expected: `${periodStart} to ${periodEnd}`,
              received: `${(updatedData as any)?.period_start} to ${(updatedData as any)?.period_end}`
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'channel_revenue',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          console.log('Channel revenue updated:', payload);
          // Automatically fetch new data when channel_revenue is updated
          fetchChannelRevenue();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'n8n_jobs', 
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const jobData = payload.new;
          console.log(`[${period}] Job status updated for store ${storeId}:`, jobData);
          
          // Verificar se o job é para o período atual
          const { startDate, endDate } = getPeriodDates(period);
          const periodStart = startDate.toISOString().split('T')[0];
          const periodEnd = endDate.toISOString().split('T')[0];
          
          if (jobData && 
              (jobData as any).period_start === periodStart && 
              (jobData as any).period_end === periodEnd) {
            
            if ((jobData as any).status === 'SUCCESS') {
              // Job completed successfully, refresh all data for this specific period
              console.log(`[${period}] Job completed successfully for store ${storeId}`);
              loadData();
              setIsSyncing(false);
              setSyncJobId(null);
              sonnerToast.success(`Sincronização ${period} concluída com sucesso!`);
            } else if ((jobData as any).status === 'ERROR') {
              // Job failed
              console.log(`[${period}] Job failed for store ${storeId}:`, (jobData as any).error);
              setIsSyncing(false);
              setSyncJobId(null);
              sonnerToast.error(`Erro na sincronização ${period}: ${(jobData as any).error || 'Erro desconhecido'}`);
            }
          } else {
            console.log(`[${period}] Job update for different period, ignoring:`, {
              expected: `${periodStart} to ${periodEnd}`,
              received: `${(jobData as any)?.period_start} to ${(jobData as any)?.period_end}`
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, fetchKlaviyoData, fetchChannelRevenue, loadData]);

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