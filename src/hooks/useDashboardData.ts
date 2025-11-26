import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  today_sales: number; // Faturamento do dia (sempre atual)
  average_daily_sales: number; // Média diária do período
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
  const [rawKlaviyoData, setRawKlaviyoData] = useState<any>(null);
  const [klaviyoSnapshotInfo, setKlaviyoSnapshotInfo] = useState<{ label: string; isFallback: boolean } | null>(null);
  const [topCampaigns, setTopCampaigns] = useState<{
    byRevenue: Campaign[];
    byConversions: Campaign[];
  }>({ byRevenue: [], byConversions: [] });
  const [topFlows, setTopFlows] = useState<{
    byRevenue: any[];
    byPerformance: any[];
  }>({ byRevenue: [], byPerformance: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(true);
  const kpiBaseRef = useRef<DashboardKPIs | null>(null);
  const lastPeriodRef = useRef<string>(period);
  const klaviyoFallbackNotifiedRef = useRef(false);

  // Converter período para datas
  const getPeriodDates = (period: string) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'today': {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
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


  const applyKpis = (klaviyoRevenue?: number | null) => {
    if (!kpiBaseRef.current) {
      return;
    }

    const hasKlaviyoRevenue = typeof klaviyoRevenue === 'number' && !Number.isNaN(klaviyoRevenue) && klaviyoRevenue > 0;
    
    console.log(`[${period}] Applying KPIs for store ${storeId}:`, {
      hasKlaviyoRevenue,
      klaviyoRevenue,
      baseKpis: kpiBaseRef.current
    });

    setKpis({
      ...kpiBaseRef.current,
      email_revenue: hasKlaviyoRevenue ? klaviyoRevenue : kpiBaseRef.current.email_revenue,
      convertfy_revenue: hasKlaviyoRevenue ? klaviyoRevenue : kpiBaseRef.current.convertfy_revenue,
    });
  };

  const updateKlaviyoState = (data: KlaviyoWebhookResponse | KlaviyoSummary['klaviyo'] | null) => {
    if (!data) {
      console.log(`[${period}] No Klaviyo data for store ${storeId}, clearing state`);
      setKlaviyoData(null);
      setTopCampaigns({ byRevenue: [], byConversions: [] });
      setTopFlows({ byRevenue: [], byPerformance: [] });
      setKlaviyoSnapshotInfo(null);
      applyKpis(0);
      return;
    }
    
    console.log(`[${period}] Updating Klaviyo state for store ${storeId}:`, data);
    
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
      setTopFlows({
        byRevenue: (webhookData.klaviyo as any).top_flows_by_revenue || [],
        byPerformance: (webhookData.klaviyo as any).top_flows_by_performance || []
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
      setTopFlows({
        byRevenue: (klaviyoData as any).top_flows_by_revenue || [],
        byPerformance: (klaviyoData as any).top_flows_by_performance || []
      });
      // Somar revenue_campaigns + revenue_flows para o faturamento Convertfy
      const convertfyRevenue = (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0);
      applyKpis(convertfyRevenue);
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

      const isDevelopment = import.meta.env.DEV;

      // DEV mode: Always skip RPC calls to avoid permission errors
      if (isDevelopment) {
        console.log('[DEV MODE] Skipping RPC calls - waiting for Klaviyo data sync');

        // If klaviyoData is available, use it
        if (klaviyoData) {
          const convertfyRevenue = (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0);
          // CRITICAL: Use Shopify total sales as base, NOT Klaviyo revenue
          const shopifyTotalSales = (klaviyoData as any).shopify_total_sales || 0;
          const shopifyTotalOrders = (klaviyoData as any).shopify_total_orders || 0;
          const shopifyNewCustomers = (klaviyoData as any).shopify_new_customers || 0;
          const shopifyReturningCustomers = (klaviyoData as any).shopify_returning_customers || 0;
          const shopifyTodaySales = (klaviyoData as any).shopify_today_sales || 0;

          // Calculate days in period for average
          const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
          const averageDailySales = shopifyTotalSales / daysInPeriod;

          const baseKpis: DashboardKPIs = {
            total_revenue: shopifyTotalSales, // ✅ SHOPIFY total, not Klaviyo
            email_revenue: convertfyRevenue,
            convertfy_revenue: convertfyRevenue,
            order_count: shopifyTotalOrders,
            customers_distinct: shopifyNewCustomers + shopifyReturningCustomers,
            customers_returning: shopifyReturningCustomers,
            currency: 'BRL',
            today_sales: shopifyTodaySales, // ✅ NEW: Faturamento de hoje
            average_daily_sales: averageDailySales, // ✅ NEW: Média diária
          };

          kpiBaseRef.current = baseKpis;
          console.log(`[${period}] Dev Mode KPIs loaded:`, {
            ...baseKpis,
            impact_percentage: shopifyTotalSales > 0 ? ((convertfyRevenue / shopifyTotalSales) * 100).toFixed(2) + '%' : '0%'
          });
          applyKpis(convertfyRevenue);
        }
        // Otherwise just skip - data will load when sync happens
        return;
      }

      // Production mode: Use RPC functions
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

      // Calculate days in period for average daily sales
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const totalRevenue = Number(kpiData?.total_revenue ?? 0);
      const averageDailySales = totalRevenue / daysInPeriod;

      // Get today's sales from klaviyoData if available
      const shopifyTodaySales = klaviyoData ? ((klaviyoData as any).shopify_today_sales || 0) : 0;

      const baseKpis: DashboardKPIs = {
        total_revenue: totalRevenue,
        email_revenue: Number(kpiData?.email_revenue ?? 0),
        convertfy_revenue: Number(kpiData?.convertfy_revenue ?? 0),
        order_count: Number(kpiData?.order_count ?? 0),
        customers_distinct: Number(customersDistinctResult.data ?? 0),
        customers_returning: Number(customersReturningResult.data ?? 0),
        currency: kpiData?.currency ?? 'BRL',
        today_sales: shopifyTodaySales, // ✅ NEW: Faturamento de hoje
        average_daily_sales: averageDailySales, // ✅ NEW: Média diária
      };

      kpiBaseRef.current = baseKpis;
      
      console.log(`[${period}] Base KPIs loaded for store ${storeId}:`, baseKpis);
      
      // Use Klaviyo campaigns + flows revenue if available
      const klaviyoRevenue = klaviyoData ? 
        (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0) : 
        null;
      
      applyKpis(klaviyoRevenue);
    } catch (error) {
      console.error('Error in fetchKPIs:', error);
    }
  };

  // Buscar série temporal para gráficos
  const fetchRevenueSeries = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period);
      const isDevelopment = import.meta.env.DEV;

      // DEV mode: Always skip RPC, generate mock data if klaviyoData available
      if (isDevelopment) {
        if (klaviyoData) {
          console.log('[DEV MODE] Generating mock revenue series');

          const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const totalRevenue = (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0);
          const avgDailyRevenue = totalRevenue / days;

          const mockData: ChartDataPoint[] = [];
          for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);

            // Add some randomness (±30%)
            const variance = 0.7 + Math.random() * 0.6;
            const dailyTotal = avgDailyRevenue * variance;
            const dailyConvertfy = dailyTotal * 0.6; // 60% from Convertfy

            mockData.push({
              date: date.toISOString().split('T')[0],
              total: Math.round(dailyTotal * 100) / 100,
              convertfy: Math.round(dailyConvertfy * 100) / 100
            });
          }

          setChartData(mockData);
        }
        return;
      }

      // Production mode: Use RPC
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

  const formatSnapshotLabel = (cache: { period_start?: string | null; period_end?: string | null; period_label?: string | null }) => {
    if (cache?.period_label) {
      return cache.period_label;
    }
    if (cache?.period_start && cache?.period_end) {
      try {
        const start = new Date(cache.period_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const end = new Date(cache.period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        return `${start} – ${end}`;
      } catch {
        return `${cache.period_start} – ${cache.period_end}`;
      }
    }
    return 'última sincronização';
  };

  const getReadablePeriod = () => {
    switch (period) {
      case 'today':
        return 'hoje';
      case '7d':
        return 'os últimos 7 dias';
      case '14d':
        return 'os últimos 14 dias';
      case '30d':
        return 'os últimos 30 dias';
      default:
        return `o período ${period}`;
    }
  };

  const applyKlaviyoCache = (
    cache: any,
    options: { isFallback?: boolean } = {}
  ) => {
    if (!cache) return false;

    if (cache.raw) {
      setRawKlaviyoData(cache.raw);
    }

    const klaviyoFromCache: KlaviyoSummary['klaviyo'] & {
      shopify_total_sales?: number;
      shopify_total_orders?: number;
      shopify_new_customers?: number;
      shopify_returning_customers?: number;
      top_flows_by_revenue?: any[];
      top_flows_by_performance?: any[];
    } = {
      revenue_total: Number(cache.revenue_total) || 0,
      revenue_campaigns: Number(cache.revenue_campaigns) || 0,
      revenue_flows: Number(cache.revenue_flows) || 0,
      orders_attributed: Number(cache.orders_attributed) || 0,
      conversions_campaigns: Number(cache.conversions_campaigns) || 0,
      conversions_flows: Number(cache.conversions_flows) || 0,
      top_campaigns_by_revenue: Array.isArray(cache.top_campaigns_by_revenue)
        ? (cache.top_campaigns_by_revenue as any[])
        : [],
      top_campaigns_by_conversions: Array.isArray(cache.top_campaigns_by_conversions)
        ? (cache.top_campaigns_by_conversions as any[])
        : [],
      leads_total: Number(cache.leads_total) || 0,
      top_flows_by_revenue: Array.isArray(cache.top_flows_by_revenue) ? (cache.top_flows_by_revenue as any[]) : [],
      top_flows_by_performance: Array.isArray(cache.top_flows_by_performance)
        ? (cache.top_flows_by_performance as any[])
        : [],
      shopify_total_sales: Number(cache.shopify_total_sales) || 0,
      shopify_total_orders: Number(cache.shopify_total_orders) || 0,
      shopify_new_customers: Number(cache.shopify_new_customers) || 0,
      shopify_returning_customers: Number(cache.shopify_returning_customers) || 0,
    };

    updateKlaviyoState(klaviyoFromCache);

    setKlaviyoSnapshotInfo({
      label: formatSnapshotLabel(cache),
      isFallback: Boolean(options.isFallback),
    });

    if (options.isFallback) {
      if (!klaviyoFallbackNotifiedRef.current) {
        sonnerToast.info(
          `Ainda não existem dados sincronizados para ${getReadablePeriod()}. Mostrando o último snapshot disponível (${formatSnapshotLabel(
            cache
          )}).`
        );
        klaviyoFallbackNotifiedRef.current = true;
      }
      setNeedsSync(true);
    } else {
      klaviyoFallbackNotifiedRef.current = false;
      setNeedsSync(false);
    }

    return true;
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

      let summaryApplied = false;

      if (cache && !cacheError) {
        summaryApplied = applyKlaviyoCache(cache);
        if (summaryApplied) {
          const dataAge = Date.now() - new Date(cache.created_at).getTime();
          if (dataAge < 10 * 60 * 1000) {
            console.log(`[${period}] Fresh data detected for store ${storeId}, age:`, Math.round(dataAge / 60000), 'minutes');
          }
        }
      }

      if (!summaryApplied) {
        console.log(`[${period}] No Klaviyo data available for store ${storeId} (${periodStart} to ${periodEnd}), trying fallback snapshot`);
        const { data: fallbackSummary } = await supabase
          .from('klaviyo_summaries')
          .select('*')
          .eq('store_id', storeId)
          .order('period_end', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackSummary) {
          applyKlaviyoCache(fallbackSummary, { isFallback: true });
          setNeedsSync(true);
        } else {
          updateKlaviyoState(null);
          setKlaviyoSnapshotInfo(null);
        }
      }
    } catch (error) {
      console.error(`[${period}] Error fetching Klaviyo data for store ${storeId}:`, error);
      updateKlaviyoState(null);
      setKlaviyoSnapshotInfo(null);
    }
  };

  // Detect period change and mark as needing sync
  useEffect(() => {
    if (lastPeriodRef.current !== period) {
      console.log(`📍 Period changed from ${lastPeriodRef.current} to ${period} - marking as needs sync`);
      setNeedsSync(true);
      lastPeriodRef.current = period;
      klaviyoFallbackNotifiedRef.current = false;
    }
  }, [period]);

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchKPIs(), fetchRevenueSeries(), fetchChannelRevenue(), fetchKlaviyoData()]);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, period]);

  const syncData = useCallback(async (forceSync: boolean = false) => {
    if (!storeId || isSyncing) return;

    setIsSyncing(true);

    try {
      const { startDate, endDate } = getPeriodDates(period);
      const periodStart = startDate.toISOString().split('T')[0];
      const periodEnd = endDate.toISOString().split('T')[0];

      console.log(`[${period}] Starting Level 2 queue-based sync for store: ${storeId}, period: ${periodStart} to ${periodEnd}, forceSync: ${forceSync}`);

      // ========================================================================
      // LEVEL 2: QUEUE-BASED SYNC WITH CACHE
      // ========================================================================

      const { QueueService } = await import('@/services/QueueService');

      // 1) Check cache first (skip if forceSync)
      if (!forceSync) {
        console.log(`[${period}] Checking cache for analytics data...`);
        const cacheResult = await QueueService.checkCache(
          storeId,
          'analytics',
          periodStart,
          periodEnd
        );

        if (cacheResult.success && cacheResult.cached && cacheResult.data) {
          console.log(`[${period}] ✓ Cache hit! Using cached data`);
          sonnerToast.success('Dados carregados do cache!', { duration: 2000 });

          // Reload data from cache
          await loadData();
          setIsSyncing(false);
          setNeedsSync(false);
          return;
        }
      } else {
        console.log(`[${period}] Force sync requested, skipping cache check`);
        sonnerToast.info('Forçando sincronização...', { duration: 2000 });
      }

      console.log(`[${period}] Adding micro-jobs to queue...`);

      // 2) Add MICRO-JOBS to queue (prevents timeout by splitting work)
      const queueResult = await QueueService.addMicroJobsToQueue(
        storeId,
        periodStart,
        periodEnd,
        1 // Higher priority for user-initiated syncs
      );

      if (!queueResult.success || !queueResult.job_ids) {
        throw new Error(queueResult.error || 'Failed to add jobs to queue');
      }

      const jobIds = queueResult.job_ids;
      const jobCount = jobIds.length;

      console.log(`[${period}] ${jobCount} micro-jobs added to queue:`, jobIds);

      // Show appropriate message
      const toastId = `sync-${storeId}-${period}`;
      sonnerToast.info(`Sincronizando ${jobCount} tipos de dados...`, {
        id: toastId,
        description: 'Analytics, Campanhas, Flows e Pedidos',
        duration: Infinity
      });

      // 3) Poll all jobs until completion
      console.log(`[${period}] Polling ${jobCount} jobs until completion...`);

      const pollResult = await QueueService.pollMultipleJobsUntilComplete(
        jobIds,
        (jobs, completed, total) => {
          // Progress callback
          console.log(`[${period}] Progress: ${completed}/${total} jobs completed`);

          sonnerToast.info(`Processando sincronização... (${completed}/${total})`, {
            id: toastId,
            description: 'Analytics, Campanhas, Flows e Pedidos',
            duration: Infinity
          });
        },
        2000, // Poll every 2 seconds
        150   // Max 5 minutes (150 * 2s = 300s = 5min)
      );

      // Dismiss the processing toast
      sonnerToast.dismiss(toastId);

      if (!pollResult.success || !pollResult.jobs) {
        throw new Error(pollResult.error || 'Jobs failed or timeout');
      }

      const finalJobs = pollResult.jobs;

      console.log(`[${period}] All ${finalJobs.length} jobs completed successfully`);

      // Aggregate results from all jobs
      let totalRevenue = 0;
      let totalOrders = 0;

      finalJobs.forEach(job => {
        const summary = job.meta?.sync_result;
        if (summary?.klaviyo) {
          totalRevenue += summary.klaviyo.total_revenue || 0;
          totalOrders += summary.klaviyo.total_orders || 0;
        }
      });

      sonnerToast.success(
        `Sincronização ${period} concluída! ` +
        `Receita: ${formatToastCurrency(totalRevenue)} | ` +
        `Pedidos: ${totalOrders}`,
        { duration: 5000 }
      );

      // Wait a bit for data to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload dashboard data
      console.log(`[${period}] Reloading dashboard data...`);
      await loadData();
      console.log(`[${period}] Dashboard data reloaded successfully!`);

      // Update store status
      try {
        const { error: storeStatusError } = await supabase
          .from('stores')
          .update({ status: 'connected', updated_at: new Date().toISOString() })
          .eq('id', storeId)
          .neq('status', 'connected');

        if (!storeStatusError) {
          console.log(`[${period}] Store ${storeId} marked as connected.`);
        }
      } catch (statusUpdateError) {
        console.warn(`[${period}] Error updating store status:`, statusUpdateError);
      }

      setIsSyncing(false);
      setNeedsSync(false);

    } catch (error: any) {
      console.error(`[${period}] Sync failed for store ${storeId}:`, error);

      if (error.message?.includes('Klaviyo credentials not configured')) {
        sonnerToast.error('Configure as credenciais do Klaviyo (API key e Site ID) para sincronizar os dados');
      } else if (error.message?.includes('Store credentials not configured')) {
        sonnerToast.error('Configure as credenciais do Shopify e Klaviyo para sincronizar os dados');
      } else {
        sonnerToast.error(`Erro na sincronização ${period}: ${error.message}`);
      }
      setIsSyncing(false);
    }
  }, [storeId, period, isSyncing, loadData]);




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

              // Clear the timeout since sync completed
              const timeoutId = (window as any).__syncTimeoutId;
              if (timeoutId) {
                clearTimeout(timeoutId);
                (window as any).__syncTimeoutId = null;
              }

              loadData();
              setIsSyncing(false);
              setNeedsSync(false); // ✅ Marca como sincronizado
              sonnerToast.success(`Sincronização ${period} concluída com sucesso!`);
            } else if ((jobData as any).status === 'ERROR') {
              // Job failed
              console.log(`[${period}] Job failed for store ${storeId}:`, (jobData as any).error);

              // Clear the timeout since sync failed
              const timeoutId = (window as any).__syncTimeoutId;
              if (timeoutId) {
                clearTimeout(timeoutId);
                (window as any).__syncTimeoutId = null;
              }

              setIsSyncing(false);
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
    klaviyoSnapshotInfo,
    rawKlaviyoData,
    topCampaigns,
    topFlows,
    isLoading,
    isSyncing,
    needsSync, // ✅ Indica se precisa sincronizar (período mudou)
    syncData,
    refetch: loadData,
  };
};
