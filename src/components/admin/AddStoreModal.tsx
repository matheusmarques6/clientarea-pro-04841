import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
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

interface AddStoreModalProps {
  clientId: string;
  onStoreAdded: () => void;
  onAddStore: (storeData: {
    client_id: string;
    name: string;
    country?: string;
    currency: string;
    status?: string;
  }) => Promise<{ data: any; error: string | null }>;
}

export const AddStoreModal: React.FC<AddStoreModalProps> = ({
  clientId,
  onStoreAdded,
  onAddStore,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    currency: 'BRL',
    status: 'active',
  });

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
      });
      
      const { error } = await onAddStore({
        client_id: clientId,
        name: formData.name,
        country: formData.country || undefined,
        currency: formData.currency,
        status: formData.status,
      });

      if (!error) {
        console.log('AddStoreModal: Store created successfully');
        setFormData({ name: '', country: '', currency: 'BRL', status: 'active' });
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
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
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