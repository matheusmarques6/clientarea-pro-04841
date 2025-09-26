import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminUserWithStores, UserStoreRole } from '@/types/admin';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUserWithStores[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers((data || []) as AdminUserWithStores[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async (userData: {
    name: string;
    email: string;
    role?: 'owner' | 'manager' | 'viewer';
    password?: string;
  }) => {
    try {
      console.log('useAdminUsers: Creating user via edge function:', userData);

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: userData,
      });

      if (error) throw error;

      await fetchUsers();
      toast({
        title: 'Usuário criado',
        description: 'Usuário criado com sucesso!',
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating user via function:', error);
      const message = error?.message || 'Erro desconhecido';
      toast({ title: 'Erro ao criar usuário', description: message, variant: 'destructive' });
      return { data: null, error: message };
    }
  };

  const updateUser = async (id: string, updates: Partial<AdminUserWithStores>) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchUsers(); // Refresh the list

      toast({
        title: "Usuário atualizado",
        description: "Usuário atualizado com sucesso!",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating user:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao atualizar usuário",
        description: message,
        variant: "destructive",
      });

      return { data: null, error: message };
    }
  };

  const assignUserToStore = async (userEmail: string, storeId: string, role: 'owner' | 'manager' | 'viewer') => {
    try {
      console.log('assignUserToStore: invoking edge function for linking');

      const { data, error } = await supabase.functions.invoke('admin-link-user-to-store', {
        body: { user_email: userEmail, store_id: storeId, role },
      });

      if (error) throw error;

      await fetchUsers();
      toast({ title: 'Usuário atribuído', description: 'Usuário atribuído à loja com sucesso!' });
      return { data, error: null };
    } catch (error: any) {
      console.error('Error assigning user to store:', error);
      const message = error?.message || 'Erro desconhecido';
      toast({ title: 'Erro ao atribuir usuário', description: message, variant: 'destructive' });
      return { data: null, error: message };
    }
  };

  const removeUserFromStore = async (userId: string, storeId: string) => {
    try {
      const { error } = await supabase
        .from('store_members')
        .delete()
        .eq('user_id', userId)
        .eq('store_id', storeId);

      if (error) throw error;

      await fetchUsers(); // Refresh the list

      toast({
        title: "Usuário removido",
        description: "Usuário removido da loja com sucesso!",
      });

      return { error: null };
    } catch (error) {
      console.error('Error removing user from store:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao remover usuário",
        description: message,
        variant: "destructive",
      });

      return { error: message };
    }
  };

  const resetUserPassword = async (userId: string, newPassword?: string) => {
    try {
      // Para reset de senha, usar a API normal de reset
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Usar resetPasswordForEmail ao invés da API admin
      const { error } = await supabase.auth.resetPasswordForEmail(userData.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Reset de senha enviado",
        description: "Um email de reset de senha foi enviado para o usuário.",
      });

      return { error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao resetar senha",
        description: message,
        variant: "destructive",
      });

      return { error: message };
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Usar edge function para deletar usuário (deleta de auth.users e public.users)
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: id },
      });

      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== id));

      toast({
        title: "Usuário removido",
        description: "Usuário removido com sucesso!",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting user:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao remover usuário",
        description: message,
        variant: "destructive",
      });

      return { error: message };
    }
  };

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    assignUserToStore,
    removeUserFromStore,
    resetUserPassword,
    deleteUser,
  };
};