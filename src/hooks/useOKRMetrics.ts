import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOKRMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      const { data: periodData } = await supabase
        .from('okr_periods')
        .select('id')
        .eq('is_active', true)
        .single();

      if (periodData) {
        const { data, error } = await supabase
          .from('okr_monthly_metrics')
          .select('*')
          .eq('period_id', periodData.id)
          .order('month', { ascending: false });

        if (error) throw error;
        setMetrics(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar métricas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addMetric = async (metricData: any) => {
    try {
      const { data, error } = await supabase
        .from('okr_monthly_metrics')
        .insert(metricData)
        .select()
        .single();

      if (error) throw error;

      await loadMetrics();
      return data;
    } catch (error) {
      console.error('Erro ao adicionar métrica:', error);
      throw error;
    }
  };

  const updateMetric = async (metricId: string, metricData: any) => {
    try {
      const { data, error } = await supabase
        .from('okr_monthly_metrics')
        .update(metricData)
        .eq('id', metricId)
        .select()
        .single();

      if (error) throw error;

      await loadMetrics();
      return data;
    } catch (error) {
      console.error('Erro ao atualizar métrica:', error);
      throw error;
    }
  };

  return {
    loading,
    metrics,
    addMetric,
    updateMetric,
    refetch: loadMetrics
  };
};