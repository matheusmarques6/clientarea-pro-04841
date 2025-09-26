import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Store {
  id: string;
  name: string;
  country?: string;
  currency?: string;
  status?: string;
  created_at: string;
  customer_id?: string;
  client_id?: string;
}

export const useStores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Ensure public.users id matches auth uid and migrate mappings
      try {
        await supabase.rpc('reconcile_user_profile', {
          _email: user.email ?? '',
          _auth_id: user.id,
          _name: (user.user_metadata as any)?.name ?? null,
        });
      } catch (e) {
        console.warn('reconcile_user_profile failed (non-fatal):', e);
      }

      // Check if user is admin
      const { data: userRecord } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      let query;
      
      if (userRecord?.is_admin) {
        // Admins can see all stores
        query = supabase
          .from('stores')
          .select(`
            *,
            clients(
              id,
              name
            )
          `)
          .order('created_at', { ascending: false });
      } else {
        // Regular users see only their stores through v_user_stores
        const { data: userStores, error: userStoresError } = await supabase
          .from('v_user_stores')
          .select('store_id')
          .eq('user_id', user.id);
        
        console.log('useStores: Fetching stores for user', { 
          userId: user.id, 
          email: user.email,
          userStores: userStores?.length || 0 
        });

        if (userStoresError) throw userStoresError;

        if (!userStores || userStores.length === 0) {
          setStores([]);
          setLoading(false);
          return;
        }

        const storeIds = userStores.map(us => us.store_id);
        
        query = supabase
          .from('stores')
          .select('*')
          .in('id', storeIds)
          .order('created_at', { ascending: false });
      }

      const { data: result, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setStores(result || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      setError(error.message);
      toast({
        title: "Erro ao carregar lojas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  return { 
    stores, 
    loading, 
    error,
    refetch: fetchStores,
    // Legacy compatibility
    isLoading: loading
  };
};

export const useStore = (storeId: string) => {
  const { stores, loading, error } = useStores();
  const store = stores?.find(s => s.id === storeId);

  return {
    store,
    isLoading: loading,
    error,
  };
};