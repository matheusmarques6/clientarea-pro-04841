import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminStore } from '@/types/admin';

export const useAdminStores = () => {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStores = async () => {
    try {
      setLoading(true);
      
      // Admin users can see all stores
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStores((data || []) as AdminStore[]);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast({
        title: "Erro ao carregar lojas",
        description: "Não foi possível carregar a lista de lojas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const createStore = async (storeData: {
    client_id: string;
    name: string;
    country?: string;
    currency: string;
    status?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .insert([{
          ...storeData,
          status: storeData.status || 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchStores(); // Refresh the list
      
      toast({
        title: "Loja criada",
        description: "Loja criada com sucesso!",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating store:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao criar loja",
        description: message,
        variant: "destructive",
      });

      return { data: null, error: message };
    }
  };

  const updateStore = async (id: string, updates: Partial<AdminStore>) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchStores(); // Refresh the list

      toast({
        title: "Loja atualizada",
        description: "Loja atualizada com sucesso!",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating store:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao atualizar loja",
        description: message,
        variant: "destructive",
      });

      return { data: null, error: message };
    }
  };

  const deleteStore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStores(prev => prev.filter(store => store.id !== id));

      toast({
        title: "Loja removida",
        description: "Loja removida com sucesso!",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting store:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao remover loja",
        description: message,
        variant: "destructive",
      });

      return { error: message };
    }
  };

  const getStoresByClient = async (clientId: string): Promise<AdminStore[]> => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AdminStore[];
    } catch (error) {
      console.error('Error fetching stores by client:', error);
      return [];
    }
  };

  return {
    stores,
    loading,
    fetchStores,
    createStore,
    updateStore,
    deleteStore,
    getStoresByClient,
  };
};