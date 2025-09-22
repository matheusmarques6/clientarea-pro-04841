import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Client, AdminUser, AdminStore } from '@/types/admin';

export const useAdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClients((data || []) as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('useAdminClients: Creating client with data:', clientData);
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      console.log('useAdminClients: Supabase response:', { data, error });

      if (error) throw error;

      setClients(prev => [data as Client, ...prev]);
      
      toast({
        title: "Cliente criado",
        description: "Cliente criado com sucesso!",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating client:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao criar cliente",
        description: message,
        variant: "destructive",
      });

      return { data: null, error: message };
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setClients(prev => prev.map(client => 
        client.id === id ? { ...client, ...data as Client } : client
      ));

      toast({
        title: "Cliente atualizado",
        description: "Cliente atualizado com sucesso!",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating client:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao atualizar cliente",
        description: message,
        variant: "destructive",
      });

      return { data: null, error: message };
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(client => client.id !== id));

      toast({
        title: "Cliente removido",
        description: "Cliente removido com sucesso!",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting client:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao remover cliente",
        description: message,
        variant: "destructive",
      });

      return { error: message };
    }
  };

  const getClientById = async (id: string): Promise<Client | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Client;
    } catch (error) {
      console.error('Error fetching client:', error);
      return null;
    }
  };

  const getClientStores = async (clientId: string): Promise<AdminStore[]> => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AdminStore[];
    } catch (error) {
      console.error('Error fetching client stores:', error);
      return [];
    }
  };

  const getClientUsers = async (clientId: string): Promise<AdminUser[]> => {
    try {
      // First try to get users through existing store memberships
      const { data: existingUsers, error: existingError } = await supabase
        .from('users')
        .select(`
          *,
          store_members!inner(
            store_id,
            role,
            stores!inner(
              id,
              name,
              client_id
            )
          )
        `)
        .eq('store_members.stores.client_id', clientId);

      if (existingError) throw existingError;

      // If we found users through store memberships, return them
      if (existingUsers && existingUsers.length > 0) {
        return existingUsers as AdminUser[];
      }

      // If no users found through stores, we can't determine client users
      // This should be handled by the calling function
      console.log('No users found for client', clientId);
      return [];
    } catch (error) {
      console.error('Error fetching client users:', error);
      return [];
    }
  };

  const addStoreToClient = async (storeData: {
    client_id: string;
    name: string;
    country?: string;
    currency: string;
    status?: string;
    userIds?: string[];
  }) => {
    try {
      console.log('addStoreToClient: Creating store with data:', storeData);
      
      // First create the store
      const { userIds, ...storeFields } = storeData as any;
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert([{
          ...storeFields,
          status: storeData.status || 'connected',
          customer_id: storeData.client_id  // Set customer_id to client_id for permissions
        }])
        .select()
        .single();

      if (storeError) throw storeError;
      console.log('addStoreToClient: Store created:', store);

      // Get users to associate - prioritize selected users, fallback to all client users
      let usersToAdd = [];
      
      if (userIds && userIds.length > 0) {
        console.log('addStoreToClient: Using selected users:', userIds);
        // Use specifically selected users
        const { data: selectedUsers, error: usersError } = await supabase
          .from('users')
          .select('id, role')
          .in('id', userIds as string[]);

        if (usersError) throw usersError;
        usersToAdd = selectedUsers || [];
      } else {
        console.log('addStoreToClient: No users selected, getting all client users');
        // Fallback to existing client users
        usersToAdd = await getClientUsers(storeData.client_id);
      }

      console.log('addStoreToClient: Users to add:', usersToAdd);

      // Add users to the new store via store_members (trigger will handle v_user_stores)
      if (usersToAdd.length > 0) {
        const storeMembers = usersToAdd.map(user => ({
          user_id: user.id,
          store_id: store.id,
          role: user.role || 'owner'  // Default to owner for better access
        }));

        console.log('addStoreToClient: Inserting store members:', storeMembers);
        
        const { error: membersError } = await supabase
          .from('store_members')
          .insert(storeMembers);

        if (membersError) {
          console.error('addStoreToClient: Error adding store members:', membersError);
          throw membersError;
        }

        console.log('addStoreToClient: Store members added successfully');
      } else {
        console.warn('addStoreToClient: No users found to associate with store');
      }

      toast({
        title: "Loja adicionada",
        description: `Loja "${store.name}" criada com ${usersToAdd.length} usuário(s) vinculado(s)!`,
      });

      return { data: store, error: null };
    } catch (error) {
      console.error('Error adding store to client:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao adicionar loja",
        description: message,
        variant: "destructive",
      });

      return { data: null, error: message };
    }
  };

  const removeStoreFromClient = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      toast({
        title: "Loja removida",
        description: "Loja removida do cliente com sucesso!",
      });

      return { error: null };
    } catch (error) {
      console.error('Error removing store from client:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao remover loja",
        description: message,
        variant: "destructive",
      });

      return { error: message };
    }
  };

  const addUserToClient = async (userData: {
    name: string;
    email: string;
    password: string;
    role: 'owner' | 'manager' | 'viewer';
  }, clientId: string) => {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Create user in users table
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Get client stores to add user to all of them
      const clientStores = await getClientStores(clientId);
      
      if (clientStores.length > 0) {
        const storeRoles = clientStores.map(store => ({
          user_id: authData.user.id,
          store_id: store.id,
          role: userData.role,
        }));

        const { error: roleError } = await supabase
          .from('store_members')
          .insert(storeRoles);

        if (roleError) throw roleError;

        // Mirror access on v_user_stores for RLS
        const vusRows = clientStores.map(store => ({ user_id: authData.user.id, store_id: store.id }));
        const { error: vusError } = await supabase
          .from('v_user_stores')
          .insert(vusRows);

        if (vusError && (vusError as any).code !== '23505') throw vusError;
      }

      toast({
        title: "Usuário adicionado",
        description: "Usuário adicionado ao cliente com sucesso!",
      });

      return { data: userRecord, error: null };
    } catch (error) {
      console.error('Error adding user to client:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao adicionar usuário",
        description: message,
        variant: "destructive",
      });

      return { data: null, error: message };
    }
  };

  const removeUserFromClient = async (userId: string, clientId: string) => {
    try {
      // Get client stores
      const clientStores = await getClientStores(clientId);
      const storeIds = clientStores.map(store => store.id);

      // Remove user store roles for this client's stores
      if (storeIds.length > 0) {
        const { error: roleError } = await supabase
          .from('store_members')
          .delete()
          .eq('user_id', userId)
          .in('store_id', storeIds);

        if (roleError) throw roleError;

        // Mirror removal on v_user_stores
        const { error: vusError } = await supabase
          .from('v_user_stores')
          .delete()
          .eq('user_id', userId)
          .in('store_id', storeIds);

        if (vusError) throw vusError;
      }

      toast({
        title: "Usuário removido",
        description: "Usuário removido do cliente com sucesso!",
      });

      return { error: null };
    } catch (error) {
      console.error('Error removing user from client:', error);
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
    clients,
    loading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    getClientById,
    getClientStores,
    getClientUsers,
    addStoreToClient,
    removeStoreFromClient,
    addUserToClient,
    removeUserFromClient,
  };
};