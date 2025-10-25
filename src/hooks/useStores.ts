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

      // Check if user is admin using RPC (bypasses RLS recursion issues)
      const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });

      let query;
      
      if (isAdmin) {
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
        // Regular users: confiar no RLS de stores para retornar apenas lojas do usuário
        query = supabase
          .from('stores')
          .select('*')
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
  const { stores, loading, error, refetch } = useStores();
  const store = stores?.find(s => s.id === storeId);

  return {
    store,
    isLoading: loading,
    error,
    refetch,
  };
};
