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
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          email: userData.email,
          role: userData.role || 'viewer',
          password_hash: userData.password ? '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' : null, // Mock hash
          is_admin: false
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchUsers(); // Refresh the list
      
      toast({
        title: "Usuário criado",
        description: "Usuário criado com sucesso!",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating user:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao criar usuário",
        description: message,
        variant: "destructive",
      });

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

  const assignUserToStore = async (userId: string, storeId: string, role: 'owner' | 'manager' | 'viewer') => {
    try {
      const { data, error } = await supabase
        .from('user_store_roles')
        .insert([{
          user_id: userId,
          store_id: storeId,
          role
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchUsers(); // Refresh the list

      toast({
        title: "Usuário atribuído",
        description: "Usuário atribuído à loja com sucesso!",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error assigning user to store:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao atribuir usuário",
        description: message,
        variant: "destructive",
      });

      return { data: null, error: message };
    }
  };

  const removeUserFromStore = async (userId: string, storeId: string) => {
    try {
      const { error } = await supabase
        .from('user_store_roles')
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

  const resetUserPassword = async (userId: string) => {
    try {
      // Generate a new token for password reset
      const resetToken = crypto.randomUUID();
      
      // In a real implementation, you'd send an email with the reset link
      // For now, we'll just show a mock token
      
      toast({
        title: "Reset de senha",
        description: `Token de reset gerado: ${resetToken}`,
      });

      return { token: resetToken, error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao resetar senha",
        description: message,
        variant: "destructive",
      });

      return { token: null, error: message };
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

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