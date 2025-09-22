import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminClients } from '@/hooks/useAdminClients';
import { useAdminStores } from '@/hooks/useAdminStores';
import { useAdminUsers } from '@/hooks/useAdminUsers';

const AdminClientCreate = () => {
  const navigate = useNavigate();
  const { createClient } = useAdminClients();
  const { createStore } = useAdminStores();
  const { createUser } = useAdminUsers();
  
  const [loading, setLoading] = useState(false);
  const [createStoreWithClient, setCreateStoreWithClient] = useState(true);
  const [createUserWithClient, setCreateUserWithClient] = useState(true);
  
  const [clientData, setClientData] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    status: 'active',
  });

  const [storeData, setStoreData] = useState({
    name: '',
    country: 'BR',
    currency: 'BRL',
  });

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create client
      const clientResult = await createClient({
        name: clientData.name,
        legal_name: clientData.legal_name || null,
        tax_id: clientData.tax_id || null,
        status: clientData.status as 'active' | 'suspended',
      });

      if (clientResult.error || !clientResult.data) {
        throw new Error(clientResult.error || 'Erro ao criar cliente');
      }

      const newClientId = clientResult.data.id;

      // 2. Create store if requested
      let newStoreId: string | null = null;
      if (createStoreWithClient && storeData.name) {
        const storeResult = await createStore({
          client_id: newClientId,
          name: storeData.name,
          country: storeData.country,
          currency: storeData.currency,
        });

        if (storeResult.data) {
          newStoreId = storeResult.data.id;
        }
      }

      // 3. Create user if requested
      if (createUserWithClient && userData.name && userData.email) {
        await createUser({
          name: userData.name,
          email: userData.email,
          password: userData.password || undefined,
          role: 'owner',
        });
      }

      navigate('/admin/clients');
    } catch (error) {
      console.error('Error creating client:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/admin/clients')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold heading-primary">Novo Cliente</h1>
          <p className="text-muted-foreground">
            Criar um novo cliente no sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Data */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Fantasia *</Label>
                <Input
                  id="name"
                  value={clientData.name}
                  onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="legal_name">Razão Social</Label>
                <Input
                  id="legal_name"
                  value={clientData.legal_name}
                  onChange={(e) => setClientData(prev => ({ ...prev, legal_name: e.target.value }))}
                  placeholder="Razão social completa"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_id">Documento (CNPJ/CPF)</Label>
                <Input
                  id="tax_id"
                  value={clientData.tax_id}
                  onChange={(e) => setClientData(prev => ({ ...prev, tax_id: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={clientData.status} 
                  onValueChange={(value) => setClientData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional Store Creation */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="create-store" 
                checked={createStoreWithClient}
                onCheckedChange={(checked) => setCreateStoreWithClient(checked === true)}
              />
              <Label htmlFor="create-store" className="font-semibold">
                Criar primeira loja junto com o cliente
              </Label>
            </div>
          </CardHeader>
          {createStoreWithClient && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Nome da Loja</Label>
                  <Input
                    id="store-name"
                    value={storeData.name}
                    onChange={(e) => setStoreData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da loja"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Select 
                    value={storeData.country} 
                    onValueChange={(value) => setStoreData(prev => ({ ...prev, country: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BR">Brasil</SelectItem>
                      <SelectItem value="US">Estados Unidos</SelectItem>
                      <SelectItem value="GB">Reino Unido</SelectItem>
                      <SelectItem value="DE">Alemanha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select 
                    value={storeData.currency} 
                    onValueChange={(value) => setStoreData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (R$)</SelectItem>
                      <SelectItem value="USD">Dólar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="GBP">Libra (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Optional User Creation */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="create-user" 
                checked={createUserWithClient}
                onCheckedChange={(checked) => setCreateUserWithClient(checked === true)}
              />
              <Label htmlFor="create-user" className="font-semibold">
                Criar primeiro usuário (owner) junto com o cliente
              </Label>
            </div>
          </CardHeader>
          {createUserWithClient && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-name">Nome Completo</Label>
                  <Input
                    id="user-name"
                    value={userData.name}
                    onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do usuário"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="user-password">Senha (opcional)</Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={userData.password}
                    onChange={(e) => setUserData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Deixe vazio para enviar convite"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/admin/clients')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="btn-primary">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Criando...' : 'Criar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminClientCreate;