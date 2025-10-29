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

        // Get all stores the user has access to
        // Check if user is admin
        const { data: isAdminData } = await supabase
          .rpc('is_admin', { _user_id: user.id });

        // Get user stores - rely on RLS to filter stores for non-admin users
        // This is the same approach used in useStores hook
        const { data: userStores, error: storesError } = await supabase
          .from('stores')
          .select('id, name, currency, client_id')
          .order('name');

        if (storesError) throw storesError;

        const storeIds = userStores?.map(s => s.id) || [];
        
        if (!userStores || userStores.length === 0) {
          setData({
            clientName: userData?.name || 'Cliente',
            totalRevenue: 0,
            totalConvertfyRevenue: 0,
            emailRevenue: 0,
            smsRevenue: 0,
            whatsappRevenue: 0,
            totalOrders: 0,
            stores: [],
            loading: false,
            error: null
          });
          return;
        }

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

        // Calculate total Convertfy revenue from already fetched RPC data
        // This is more reliable than klaviyo_summaries which may not be synced
        const totalConvertfyRevenue = totalEmailRevenue + totalSmsRevenue + totalWhatsappRevenue;

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