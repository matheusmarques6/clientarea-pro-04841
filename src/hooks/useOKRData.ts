import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOKRData = () => {
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<any[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    loadOKRData();
  }, []);

  const loadOKRData = async () => {
    try {
      setLoading(true);

      // Carregar períodos
      const { data: periodsData } = await supabase
        .from('okr_periods')
        .select('*')
        .order('start_date', { ascending: false });

      setPeriods(periodsData || []);

      // Período atual
      const activePeriod = periodsData?.find(p => p.is_active);
      setCurrentPeriod(activePeriod);

      if (activePeriod) {
        // Carregar scores do período
        const { data: scoresData } = await supabase
          .from('okr_period_scores')
          .select(`
            *,
            profile:users(id, name, email, role, level)
          `)
          .eq('period_id', activePeriod.id)
          .order('score_pct', { ascending: false });

        setScores(scoresData || []);

        // Carregar objetivos
        const { data: objectivesData } = await supabase
          .from('okr_objectives')
          .select(`
            *,
            key_results:okr_key_results(*)
          `)
          .eq('period_id', activePeriod.id);

        setObjectives(objectivesData || []);

        // Calcular métricas
        const avgScore = scoresData?.reduce((acc, s) => acc + s.score_pct, 0) / (scoresData?.length || 1);
        const totalBonus = scoresData?.reduce((acc, s) => acc + s.bonus_value, 0) || 0;
        const activeUsers = scoresData?.length || 0;
        const totalObjectives = objectivesData?.length || 0;

        // Carregar flags recentes
        const { data: flagsData } = await supabase
          .from('okr_performance_flags')
          .select('*')
          .eq('period_id', activePeriod.id)
          .order('occurred_on', { ascending: false })
          .limit(5);

        setMetrics({
          avgScore: Math.round(avgScore),
          totalBonus,
          activeUsers,
          totalObjectives,
          recentFlags: flagsData || []
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados OKR:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados OKR',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async (profileId: string, periodId: string) => {
    try {
      const { data, error } = await supabase.rpc('calculate_okr_score', {
        p_profile_id: profileId,
        p_period_id: periodId
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Score recalculado com sucesso'
      });

      await loadOKRData();
      return data;
    } catch (error) {
      console.error('Erro ao calcular score:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao calcular score',
        variant: 'destructive'
      });
    }
  };

  const checkFlags = async (profileId: string, periodId: string) => {
    try {
      const { error } = await supabase.rpc('check_okr_flags', {
        p_profile_id: profileId,
        p_period_id: periodId
      });

      if (error) throw error;

      await loadOKRData();
    } catch (error) {
      console.error('Erro ao verificar flags:', error);
    }
  };

  return {
    loading,
    periods,
    currentPeriod,
    scores,
    objectives,
    metrics,
    calculateScore,
    checkFlags,
    refetch: loadOKRData
  };
};