import { useSupabaseData } from './useSupabaseData';

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
  const { data: stores, loading, error, refetch } = useSupabaseData<Store>('stores', `
    *,
    clients(
      id,
      name
    )
  `);

  return { 
    stores, 
    loading, 
    error,
    refetch,
    // Legacy compatibility
    isLoading: loading
  };
};

export const useStore = (storeId: string) => {
  const { data: stores, loading, error } = useSupabaseData<Store>('stores', '*', [storeId]);
  const store = stores?.find(s => s.id === storeId);

  return {
    store,
    isLoading: loading,
    error,
  };
};