import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Store, 
  Edit, 
  Save, 
  X,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminClients } from '@/hooks/useAdminClients';
import { useToast } from '@/hooks/use-toast';
import { Client, AdminStore, AdminUser } from '@/types/admin';

const AdminClientDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getClientById, updateClient, getClientStores, getClientUsers } = useAdminClients();
  
  const [client, setClient] = useState<Client | null>(null);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    status: 'active'
  });

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [clientData, storesData, usersData] = await Promise.all([
        getClientById(id),
        getClientStores(id),
        getClientUsers(id)
      ]);

      if (clientData) {
        setClient(clientData);
        setFormData({
          name: clientData.name,
          legal_name: clientData.legal_name || '',
          tax_id: clientData.tax_id || '',
          status: clientData.status
        });
      }
      setStores(storesData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do cliente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !client) return;

    try {
      const { error } = await updateClient(id, formData);
      if (!error) {
        setClient({ ...client, ...formData });
        setIsEditing(false);
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso!",
        });
      }
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const handleCancel = () => {
    if (client) {
      setFormData({
        name: client.name,
        legal_name: client.legal_name || '',
        tax_id: client.tax_id || '',
        status: client.status
      });
    }
    setIsEditing(false);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { 
        icon: CheckCircle2, 
        text: 'Ativo', 
        className: 'bg-green-100 text-green-700 hover:bg-green-100' 
      },
      suspended: { 
        icon: XCircle, 
        text: 'Suspenso', 
        className: 'bg-red-100 text-red-700 hover:bg-red-100' 
      }
    };
    
    const statusConfig = config[status as keyof typeof config] || {
      icon: AlertCircle,
      text: status,
      className: 'bg-gray-100 text-gray-700 hover:bg-gray-100'
    };
    
    const Icon = statusConfig.icon;
    
    return (
      <Badge className={statusConfig.className}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Cliente não encontrado</h2>
            <p className="text-muted-foreground">
              O cliente solicitado não foi encontrado ou você não tem permissão para visualizá-lo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold heading-primary">{client.name}</h1>
            <p className="text-muted-foreground">
              Detalhes e configurações do cliente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} className="btn-primary">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="btn-primary">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="stores">Lojas ({stores.length})</TabsTrigger>
          <TabsTrigger value="users">Usuários ({users.length})</TabsTrigger>
        </TabsList>

        {/* Client Information */}
        <TabsContent value="info">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do cliente"
                    />
                  ) : (
                    <p className="text-sm p-3 bg-muted rounded-md">{client.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_name">Razão Social</Label>
                  {isEditing ? (
                    <Input
                      id="legal_name"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      placeholder="Razão social"
                    />
                  ) : (
                    <p className="text-sm p-3 bg-muted rounded-md">{client.legal_name || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id">Documento</Label>
                  {isEditing ? (
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder="CNPJ/CPF"
                    />
                  ) : (
                    <p className="text-sm p-3 bg-muted rounded-md">{client.tax_id || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  {isEditing ? (
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3">
                      {getStatusBadge(client.status)}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Criado em:</span>
                    <p>{new Date(client.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  {client.updated_at && (
                    <div>
                      <span className="font-medium">Atualizado em:</span>
                      <p>{new Date(client.updated_at).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stores */}
        <TabsContent value="stores">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Lojas do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stores.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>País</TableHead>
                        <TableHead>Moeda</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stores.map((store) => (
                        <TableRow key={store.id}>
                          <TableCell className="font-medium">{store.name}</TableCell>
                          <TableCell>{store.country || '-'}</TableCell>
                          <TableCell>{store.currency}</TableCell>
                          <TableCell>{getStatusBadge(store.status)}</TableCell>
                          <TableCell>
                            {new Date(store.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Nenhuma loja encontrada para este cliente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuários do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Nenhum usuário encontrado para este cliente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminClientDetails;