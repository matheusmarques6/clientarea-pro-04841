import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOKRObjectives = () => {
  const [loading, setLoading] = useState(true);
  const [objectives, setObjectives] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadObjectives();
  }, []);

  const loadObjectives = async () => {
    try {
      setLoading(true);
      
      // Buscar período ativo
      const { data: periodData } = await supabase
        .from('okr_periods')
        .select('id')
        .eq('is_active', true)
        .single();

      if (periodData) {
        // Buscar objetivos com key results
        const { data, error } = await supabase
          .from('okr_objectives')
          .select(`
            *,
            key_results:okr_key_results(*)
          `)
          .eq('period_id', periodData.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setObjectives(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar objetivos:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar objetivos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addObjective = async (objectiveData: any) => {
    try {
      const { data, error } = await supabase
        .from('okr_objectives')
        .insert(objectiveData)
        .select()
        .single();

      if (error) throw error;

      await loadObjectives();
      return data;
    } catch (error) {
      console.error('Erro ao adicionar objetivo:', error);
      throw error;
    }
  };

  const updateObjective = async (objectiveId: string, objectiveData: any) => {
    try {
      const { data, error } = await supabase
        .from('okr_objectives')
        .update(objectiveData)
        .eq('id', objectiveId)
        .select()
        .single();

      if (error) throw error;

      await loadObjectives();
      return data;
    } catch (error) {
      console.error('Erro ao atualizar objetivo:', error);
      throw error;
    }
  };

  const deleteObjective = async (objectiveId: string) => {
    try {
      const { error } = await supabase
        .from('okr_objectives')
        .delete()
        .eq('id', objectiveId);

      if (error) throw error;

      await loadObjectives();
    } catch (error) {
      console.error('Erro ao deletar objetivo:', error);
      throw error;
    }
  };

  const addKeyResult = async (krData: any) => {
    try {
      const { data, error } = await supabase
        .from('okr_key_results')
        .insert(krData)
        .select()
        .single();

      if (error) throw error;

      await loadObjectives();
      return data;
    } catch (error) {
      console.error('Erro ao adicionar key result:', error);
      throw error;
    }
  };

  const updateKeyResult = async (krId: string, krData: any) => {
    try {
      const { data, error } = await supabase
        .from('okr_key_results')
        .update(krData)
        .eq('id', krId)
        .select()
        .single();

      if (error) throw error;

      await loadObjectives();
      return data;
    } catch (error) {
      console.error('Erro ao atualizar key result:', error);
      throw error;
    }
  };

  const deleteKeyResult = async (krId: string) => {
    try {
      const { error } = await supabase
        .from('okr_key_results')
        .delete()
        .eq('id', krId);

      if (error) throw error;

      await loadObjectives();
    } catch (error) {
      console.error('Erro ao deletar key result:', error);
      throw error;
    }
  };

  return {
    loading,
    objectives,
    addObjective,
    updateObjective,
    deleteObjective,
    addKeyResult,
    updateKeyResult,
    deleteKeyResult,
    refetch: loadObjectives
  };
};