import React, { useState } from 'react';
import { Plus, X, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminStores } from '@/hooks/useAdminStores';
import { useAdminClients } from '@/hooks/useAdminClients';
import { supabase } from '@/integrations/supabase/client';

interface CreateUserStoreModalProps {
  onUserCreated: () => void;
}

export const CreateUserStoreModal: React.FC<CreateUserStoreModalProps> = ({
  onUserCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { clients } = useAdminClients();
  
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'owner' as 'owner' | 'manager' | 'viewer',
    client_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.client_id) {
      return;
    }

    setLoading(true);
    try {
      console.log('CreateUserStoreModal: Creating user and store with combined function');
      
      // Use the new combined function that creates user first, then store, then associates them
      const { data, error } = await supabase.functions.invoke('admin-create-user-and-store', {
        body: {
          user_name: formData.name,
          user_email: formData.email,
          user_password: formData.password,
          user_role: formData.role,
          store_name: `Loja de ${formData.name}`, // Auto-generate store name
          store_client_id: formData.client_id,
          store_country: 'BR',
          store_currency: 'BRL',
        },
      });

      if (error) {
        console.error('CreateUserStoreModal: Error:', error);
        throw error;
      }

      console.log('CreateUserStoreModal: User and store created successfully:', data);
      
      setFormData({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'owner',
        client_id: ''
      });
      setOpen(false);
      onUserCreated();
    } catch (error) {
      console.error('CreateUserStoreModal: Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Criar Usuário + Loja
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Usuário e Loja para Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      {client.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-name">Nome Completo *</Label>
            <Input
              id="user-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome completo do usuário"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">Senha *</Label>
            <Input
              id="user-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Senha (mín. 6 caracteres)"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-role">Função na Loja</Label>
            <Select value={formData.role} onValueChange={(value: 'owner' | 'manager' | 'viewer') => setFormData({ ...formData, role: value })}>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.client_id}
            >
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};