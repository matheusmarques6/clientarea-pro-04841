import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface StoreKPIs {
  total_revenue: number;
  email_revenue: number;
  sms_revenue: number;
  whatsapp_revenue: number;
  order_count: number;
  currency: string;
  convertfy_revenue: number;
  period_start: string;
  period_end: string;
}

interface ClientDashboardData {
  clientName: string;
  totalRevenue: number;
  totalConvertfyRevenue: number; // Total Convertfy de todas as lojas
  emailRevenue: number;
  smsRevenue: number;
  whatsappRevenue: number;
  totalOrders: number;
  stores: Array<{
    id: string;
    name: string;
    currency: string;
    revenue: number;
    convertfyRevenue?: number; // Convertfy revenue per store
  }>;
  loading: boolean;
  error: string | null;
}

export const useClientDashboard = (period: string = '30d') => {
  const { user } = useAuth();
  const [data, setData] = useState<ClientDashboardData>({
    clientName: '',
    totalRevenue: 0,
    totalConvertfyRevenue: 0,
    emailRevenue: 0,
    smsRevenue: 0,
    whatsappRevenue: 0,
    totalOrders: 0,
    stores: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Get user profile
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        // Get all stores the user has access to through store_members
        const { data: storeMembers } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', user.id);

        if (!storeMembers || storeMembers.length === 0) {
          setData(prev => ({ ...prev, loading: false }));
          return;
        }

        const storeIds = storeMembers.map(sm => sm.store_id);

        const { data: userStores, error: storesError } = await supabase
          .from('stores')
          .select('id, name, currency, client_id')
          .in('id', storeIds);

        if (storesError) throw storesError;

        // Calculate period dates
        const endDate = new Date();
        const startDate = new Date();
        
        switch (period) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          case 'MTD':
            startDate.setDate(1);
            break;
          case 'YTD':
            startDate.setMonth(0, 1);
            break;
          default: // 30d
            startDate.setDate(endDate.getDate() - 30);
        }

        // Fetch KPIs for each store
        let totalRevenue = 0;
        let totalEmailRevenue = 0;
        let totalSmsRevenue = 0;
        let totalWhatsappRevenue = 0;
        let totalOrders = 0;
        const storesWithRevenue = [];

        for (const store of userStores || []) {
          const { data: kpis, error: kpiError } = await supabase
            .rpc('rpc_get_store_kpis', {
              _store_id: store.id,
              _start_date: startDate.toISOString(),
              _end_date: endDate.toISOString()
            });

          if (!kpiError && kpis) {
            const kpisData = kpis as unknown as StoreKPIs;
            // Accumulate totals
            totalRevenue += Number(kpisData.total_revenue || 0);
            totalEmailRevenue += Number(kpisData.email_revenue || 0);
            totalSmsRevenue += Number(kpisData.sms_revenue || 0);
            totalWhatsappRevenue += Number(kpisData.whatsapp_revenue || 0);
            totalOrders += Number(kpisData.order_count || 0);

            const storeConvertfyRevenue = Number(kpisData.email_revenue || 0) + 
                                          Number(kpisData.sms_revenue || 0) + 
                                          Number(kpisData.whatsapp_revenue || 0);
            
            storesWithRevenue.push({
              id: store.id,
              name: store.name,
              currency: kpisData.currency || store.currency || 'BRL',
              revenue: Number(kpisData.total_revenue || 0),
              convertfyRevenue: storeConvertfyRevenue
            });
          }
        }
        
        // Fetch Convertfy revenue (flows + campaigns) for all stores in the selected period
        const startDateStr = startDate.toISOString().slice(0, 10);
        const endDateStr = endDate.toISOString().slice(0, 10);

        const { data: convertfySummaries, error: summariesError } = await supabase
          .from('klaviyo_summaries')
          .select('store_id, revenue_flows, revenue_campaigns, period_start, period_end')
          .in('store_id', storeIds)
          .gte('period_start', startDateStr)
          .lte('period_end', endDateStr);

        const convertfyByStore: Record<string, number> = {};
        if (!summariesError && convertfySummaries) {
          (convertfySummaries as any[]).forEach((row: any) => {
            const sid = row.store_id as string;
            const flows = Number(row.revenue_flows || 0);
            const campaigns = Number(row.revenue_campaigns || 0);
            convertfyByStore[sid] = (convertfyByStore[sid] || 0) + flows + campaigns;
          });
        }

        // Attach per-store Convertfy revenue (flows + campaigns)
        (storesWithRevenue as any[]).forEach((s: any) => {
          s.convertfyRevenue = convertfyByStore[s.id] || 0;
        });

        // Calculate total Convertfy revenue across all client's stores
        const totalConvertfyRevenue = Object.values(convertfyByStore).reduce((sum, v) => sum + v, 0);
        
        console.log('Dashboard totals:', {
          stores: userStores?.length || 0,
          totalRevenue,
          totalConvertfyRevenue,
          emailRevenue: totalEmailRevenue,
          smsRevenue: totalSmsRevenue,
          whatsappRevenue: totalWhatsappRevenue
        });

        // Get client name from first store (all stores belong to same client)
        let clientName = userData?.name || 'Cliente';
        
        if (userStores && userStores.length > 0 && userStores[0].client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('name')
            .eq('id', userStores[0].client_id)
            .single();
          
          if (clientData) {
            clientName = clientData.name;
          }
        }

        setData({
          clientName,
          totalRevenue,
          totalConvertfyRevenue,
          emailRevenue: totalEmailRevenue,
          smsRevenue: totalSmsRevenue,
          whatsappRevenue: totalWhatsappRevenue,
          totalOrders,
          stores: storesWithRevenue,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar dados do dashboard'
        }));
      }
    };

    fetchDashboardData();
  }, [user, period]);

  return data;
};