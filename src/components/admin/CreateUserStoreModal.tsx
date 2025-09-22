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
import { useAdminUsers } from '@/hooks/useAdminUsers';

interface CreateUserStoreModalProps {
  onUserCreated: () => void;
}

export const CreateUserStoreModal: React.FC<CreateUserStoreModalProps> = ({
  onUserCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { stores } = useAdminStores();
  const { createUser, assignUserToStore } = useAdminUsers();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer' as 'owner' | 'manager' | 'viewer',
    store_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.store_id) {
      return;
    }

    setLoading(true);
    try {
      console.log('CreateUserStoreModal: Creating user with data:', formData);
      
      // Primeiro criar o usuário
      const { error } = await createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      if (!error) {
        console.log('CreateUserStoreModal: User created successfully, now assigning to store');
        // Depois associar à loja específica usando o email do usuário
        await assignUserToStore(formData.email, formData.store_id, formData.role);
        
        setFormData({ 
          name: '', 
          email: '', 
          password: '', 
          role: 'viewer',
          store_id: ''
        });
        setOpen(false);
        onUserCreated();
      } else {
        console.error('CreateUserStoreModal: Error creating user:', error);
      }
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
          <DialogTitle>Criar Usuário para Loja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store">Loja *</Label>
            <Select value={formData.store_id} onValueChange={(value) => setFormData({ ...formData, store_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma loja" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      {store.name}
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
              disabled={loading || !formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.store_id}
            >
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};