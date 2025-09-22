import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { supabase } from '@/integrations/supabase/client';

interface AddStoreModalProps {
  clientId: string;
  onStoreAdded: () => void;
  onAddStore: (storeData: {
    client_id: string;
    name: string;
    country?: string;
    currency: string;
    status?: string;
    userIds?: string[];
  }) => Promise<{ data: any; error: string | null }>;
}

export const AddStoreModal: React.FC<AddStoreModalProps> = ({
  clientId,
  onStoreAdded,
  onAddStore,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    currency: 'BRL',
    status: 'connected',
  });

  // Carregar usuários do sistema quando o modal abrir
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .neq('is_admin', true)
        .order('name');

      if (error) throw error;
      setUsers(data || []);
      setSelectedUserIds((data || []).map((u: any) => u.id)); // pré-seleciona todos
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      console.log('AddStoreModal: Creating store with data:', {
        client_id: clientId,
        name: formData.name,
        country: formData.country || undefined,
        currency: formData.currency,
        status: formData.status,
        userIds: selectedUserIds,
      });
      
      const { error } = await onAddStore({
        client_id: clientId,
        name: formData.name,
        country: formData.country || undefined,
        currency: formData.currency,
        status: formData.status,
        userIds: selectedUserIds,
      });

      if (!error) {
        console.log('AddStoreModal: Store created successfully');
        setFormData({ name: '', country: '', currency: 'BRL', status: 'connected' });
        setSelectedUserIds([]);
        setOpen(false);
        onStoreAdded();
      } else {
        console.error('AddStoreModal: Error creating store:', error);
      }
    } catch (error) {
      console.error('AddStoreModal: Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Loja
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Nova Loja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">Nome da Loja *</Label>
            <Input
              id="store-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome da loja"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-country">País</Label>
            <Input
              id="store-country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="País (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-currency">Moeda *</Label>
            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
                <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connected">Conectada</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Usuários com Acesso</Label>
            <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <Label htmlFor={`user-${user.id}`} className="text-sm">
                        {user.name} ({user.email})
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione os usuários que terão acesso a esta loja
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Adicionando...' : 'Adicionar Loja'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};