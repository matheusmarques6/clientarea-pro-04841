import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Key, Building2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAdminStores } from '@/hooks/useAdminStores';
import { supabase } from '@/integrations/supabase/client';
import { AdminUserWithStores, AdminStore } from '@/types/admin';

interface UserEditModalProps {
  user: AdminUserWithStores | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

interface UserStoreRole {
  id: string;
  store_id: string;
  role: 'owner' | 'manager' | 'viewer';
  store: {
    id: string;
    name: string;
    client_id: string;
  };
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  open,
  onOpenChange,
  onUserUpdated
}) => {
  const { toast } = useToast();
  const { updateUser, resetUserPassword } = useAdminUsers();
  const { stores } = useAdminStores();
  
  const [loading, setLoading] = useState(false);
  const [userStores, setUserStores] = useState<UserStoreRole[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    role: 'viewer' as 'owner' | 'manager' | 'viewer',
    newPassword: ''
  });

  useEffect(() => {
    if (user && open) {
      setFormData({
        name: user.name,
        role: (user.role as 'owner' | 'manager' | 'viewer') || 'viewer',
        newPassword: ''
      });
      fetchUserStores();
    }
  }, [user, open]);

  const fetchUserStores = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_store_roles')
        .select(`
          id,
          store_id,
          role,
          stores (
            id,
            name,
            client_id
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        id: item.id,
        store_id: item.store_id,
        role: item.role as 'owner' | 'manager' | 'viewer',
        store: {
          id: item.stores.id,
          name: item.stores.name,
          client_id: item.stores.client_id
        }
      }));
      
      setUserStores(transformedData);
    } catch (error) {
      console.error('Error fetching user stores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as lojas do usuário.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await updateUser(user.id, {
        name: formData.name,
        role: formData.role
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });

      onUserUpdated();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    if (!formData.newPassword) {
      toast({
        title: "Erro",
        description: "Digite uma nova senha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Reset password using Supabase Admin API
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: formData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "A senha do usuário foi alterada com sucesso.",
      });

      setFormData(prev => ({ ...prev, newPassword: '' }));
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStoreAccess = async (storeId: string, role: 'owner' | 'manager' | 'viewer') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_store_roles')
        .insert([{
          user_id: user.id,
          store_id: storeId,
          role
        }]);

      if (error) throw error;

      toast({
        title: "Acesso adicionado",
        description: "O usuário foi adicionado à loja com sucesso.",
      });

      fetchUserStores();
    } catch (error) {
      console.error('Error adding store access:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar acesso à loja.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveStoreAccess = async (userStoreRoleId: string) => {
    try {
      const { error } = await supabase
        .from('user_store_roles')
        .delete()
        .eq('id', userStoreRoleId);

      if (error) throw error;

      toast({
        title: "Acesso removido",
        description: "O acesso à loja foi removido com sucesso.",
      });

      fetchUserStores();
    } catch (error) {
      console.error('Error removing store access:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o acesso à loja.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStoreRole = async (userStoreRoleId: string, newRole: 'owner' | 'manager' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_store_roles')
        .update({ role: newRole })
        .eq('id', userStoreRoleId);

      if (error) throw error;

      toast({
        title: "Função atualizada",
        description: "A função do usuário na loja foi atualizada.",
      });

      fetchUserStores();
    } catch (error) {
      console.error('Error updating store role:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a função.",
        variant: "destructive",
      });
    }
  };

  const availableStores = stores.filter(store => 
    !userStores.some(us => us.store_id === store.id)
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'manager': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'manager': return 'Gerente';
      case 'viewer': return 'Visualizador';
      default: return 'Indefinido';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Editar Usuário: {user.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="stores">Lojas</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Usuário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="role">Função Global</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: 'owner' | 'manager' | 'viewer') => 
                      setFormData(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="owner">Proprietário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleUpdateUser} disabled={loading}>
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Lojas com Acesso ({userStores.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userStores.length > 0 ? (
                  <div className="space-y-3">
                    {userStores.map((userStore) => (
                      <div key={userStore.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{userStore.store.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {userStore.store.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={userStore.role} 
                            onValueChange={(value: 'owner' | 'manager' | 'viewer') => 
                              handleUpdateStoreRole(userStore.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Visualizador</SelectItem>
                              <SelectItem value="manager">Gerente</SelectItem>
                              <SelectItem value="owner">Proprietário</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant={getRoleBadgeVariant(userStore.role)}>
                            {getRoleLabel(userStore.role)}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveStoreAccess(userStore.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Este usuário não tem acesso a nenhuma loja
                  </p>
                )}
              </CardContent>
            </Card>

            {availableStores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Adicionar Acesso à Loja</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableStores.map((store) => (
                      <div key={store.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {store.country} • {store.currency}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddStoreAccess(store.id, 'viewer')}
                          >
                            Visualizador
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddStoreAccess(store.id, 'manager')}
                          >
                            Gerente
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddStoreAccess(store.id, 'owner')}
                          >
                            Proprietário
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Alterar Senha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Digite a nova senha"
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleResetPassword} 
                    disabled={loading || !formData.newPassword}
                  >
                    Alterar Senha
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações da Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em:</span>
                  <span>{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última atualização:</span>
                  <span>{new Date(user.updated_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">É Admin:</span>
                  <Badge variant={user.is_admin ? 'destructive' : 'outline'}>
                    {user.is_admin ? 'Sim' : 'Não'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};