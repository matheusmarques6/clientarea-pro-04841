import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductCostData {
  id: string;
  sku: string;
  product_title?: string;
  variant_title?: string;
  price?: number;
  cost_brl?: number;
  cost_usd?: number;
  cost_eur?: number;
  cost_gbp?: number;
  updated_at: string;
  updated_by?: string;
  store_id: string;
}

export const useProductCosts = (storeId: string) => {
  const [data, setData] = useState<ProductCostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProductCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: result, error: fetchError } = await supabase
        .from('product_costs')
        .select('*')
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setData(result || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Error fetching product costs:', err);
      
      if (!errorMessage.includes('JWT') && !errorMessage.includes('token')) {
        toast({
          title: "Erro ao carregar custos",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const saveProductCost = async (costData: Partial<ProductCostData> & { sku: string }) => {
    try {
      const { error } = await supabase
        .from('product_costs')
        .upsert({
          ...costData,
          store_id: storeId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'sku,store_id'
        });

      if (error) {
        throw error;
      }

      await fetchProductCosts(); // Refetch data
      
      toast({
        title: "Custo salvo",
        description: "Custo do produto atualizado com sucesso",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error saving product cost:', err);
      
      toast({
        title: "Erro ao salvar custo",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const saveBulkCosts = async (costs: { [sku: string]: any }) => {
    try {
      const costArray = Object.entries(costs).map(([sku, cost]) => ({
        sku,
        store_id: storeId,
        cost_brl: cost.BRL || null,
        cost_usd: cost.USD || null,
        cost_eur: cost.EUR || null,
        cost_gbp: cost.GBP || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('product_costs')
        .upsert(costArray, {
          onConflict: 'sku,store_id'
        });

      if (error) {
        throw error;
      }

      await fetchProductCosts();
      
      toast({
        title: "Custos salvos",
        description: "Custos de produtos atualizados com sucesso",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error saving bulk costs:', err);
      
      toast({
        title: "Erro ao salvar custos",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchProductCosts();
    }
  }, [storeId]);

  return {
    data,
    loading,
    error,
    refetch: fetchProductCosts,
    saveProductCost,
    saveBulkCosts,
  };
};