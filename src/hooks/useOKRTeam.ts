import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOKRTeam = () => {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setTeam(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar equipe',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async (memberData: any) => {
    try {
      // Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: memberData.email,
        password: Math.random().toString(36).slice(-8), // Senha temporária
        options: {
          data: {
            name: memberData.name
          }
        }
      });

      if (authError) throw authError;

      // Atualizar dados do usuário
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: memberData.name,
          role: memberData.role,
          level: memberData.level,
          base_salary: memberData.base_salary,
          variable_pct: memberData.variable_pct,
          department: memberData.department
        })
        .eq('id', authData.user?.id);

      if (updateError) throw updateError;

      await loadTeam();
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      throw error;
    }
  };

  const updateTeamMember = async (memberId: string, memberData: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: memberData.name,
          role: memberData.role,
          level: memberData.level,
          base_salary: memberData.base_salary,
          variable_pct: memberData.variable_pct,
          department: memberData.department
        })
        .eq('id', memberId);

      if (error) throw error;

      await loadTeam();
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      throw error;
    }
  };

  const deleteTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await loadTeam();
    } catch (error) {
      console.error('Erro ao deletar membro:', error);
      throw error;
    }
  };

  return {
    loading,
    team,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    refetch: loadTeam
  };
};