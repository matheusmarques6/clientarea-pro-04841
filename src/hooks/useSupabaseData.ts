import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UseSupabaseDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSupabaseData = <T>(
  table: string,
  query?: string,
  deps: any[] = []
): UseSupabaseDataResult<T> => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let supabaseQuery = (supabase as any).from(table).select(query || '*');
      
      const { data: result, error: fetchError } = await supabaseQuery;

      if (fetchError) {
        throw fetchError;
      }

      setData((result || []) as T[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error(`Error fetching ${table}:`, err);
      
      // Only show toast for non-auth errors
      if (!errorMessage.includes('JWT') && !errorMessage.includes('token')) {
        toast({
          title: `Erro ao carregar ${table}`,
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, deps);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

// Specialized hooks for common entities

export const useReturns = (storeId?: string) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('returns')
        .select(`
          *,
          return_items(*),
          return_events(*),
          return_labels(*)
        `)
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setData(result || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Error fetching returns:', err);
      
      if (!errorMessage.includes('JWT') && !errorMessage.includes('token')) {
        toast({
          title: "Erro ao carregar devoluções",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [storeId]);

  return {
    data,
    loading,
    error,
    refetch: fetchReturns,
  };
};

export const useRefunds = (storeId?: string) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('refunds')
        .select(`
          *,
          refund_events(*),
          refund_payments(*)
        `)
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setData(result || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Error fetching refunds:', err);
      
      if (!errorMessage.includes('JWT') && !errorMessage.includes('token')) {
        toast({
          title: "Erro ao carregar reembolsos",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [storeId]);

  return {
    data,
    loading,
    error,
    refetch: fetchRefunds,
  };
};

export const useProducts = (storeId?: string) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('products')
        .select(`
          *,
          variants(*)
        `)
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setData(result || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Error fetching products:', err);
      
      if (!errorMessage.includes('JWT') && !errorMessage.includes('token')) {
        toast({
          title: "Erro ao carregar produtos",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [storeId]);

  return {
    data,
    loading,
    error,
    refetch: fetchProducts,
  };
};