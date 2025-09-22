import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

export interface Store {
  id: string;
  name: string;
  country?: string;
  currency?: string;
  status?: string;
  created_at: string;
  customer_id?: string;
}

export const useStores = () => {
  const storesQuery = useSupabaseQuery(
    ['stores'],
    async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Store[];
    }
  );

  return {
    stores: storesQuery.data || [],
    isLoading: storesQuery.isLoading,
    error: storesQuery.error,
  };
};

export const useStore = (storeId: string) => {
  const storeQuery = useSupabaseQuery(
    ['store', storeId],
    async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      return data as Store;
    },
    { enabled: !!storeId }
  );

  return {
    store: storeQuery.data,
    isLoading: storeQuery.isLoading,
    error: storeQuery.error,
  };
};