import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ReturnRequest } from '@/types';

interface NewReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  onCreated?: (created: ReturnRequest) => void;
}

const typeOptions = [
  { label: 'Troca', value: 'exchange' },
  { label: 'Devolução', value: 'return' },
  { label: 'Reembolso', value: 'refund' },
];

export const NewReturnModal = ({ isOpen, onClose, storeId, onCreated }: NewReturnModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    orderCode: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    type: 'return',
    reason: '',
    amount: '',
    note: '',
  });

  const resetForm = () => {
    setForm({
      orderCode: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      type: 'return',
      reason: '',
      amount: '',
      note: '',
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        store_id: storeId,
        order_code: form.orderCode.trim(),
        customer_name: form.customerName.trim(),
        customer_email: form.customerEmail.trim() || null,
        customer_phone: form.customerPhone.trim() || null,
        type: form.type,
        reason: form.reason.trim() || null,
        amount: Number(form.amount) || 0,
        status: 'new',
        origin: 'internal',
        notes: form.note.trim() || null,
      };

      const { data, error } = await supabase
        .from('returns')
        .insert(payload)
        .select('*, return_events(*), return_items(*), return_labels(*)')
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Solicitação criada',
        description: 'A nova solicitação foi registrada com sucesso.',
      });

      if (onCreated && data) {
        onCreated(data as ReturnRequest);
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating return:', error);
      toast({
        title: 'Erro ao criar solicitação',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderCode">Número do Pedido *</Label>
              <Input
                id="orderCode"
                required
                value={form.orderCode}
                onChange={(e) => handleChange('orderCode', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customerName">Nome do Cliente *</Label>
              <Input
                id="customerName"
                required
                value={form.customerName}
                onChange={(e) => handleChange('customerName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">E-mail</Label>
              <Input
                id="customerEmail"
                type="email"
                value={form.customerEmail}
                onChange={(e) => handleChange('customerEmail', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Telefone</Label>
              <Input
                id="customerPhone"
                value={form.customerPhone}
                onChange={(e) => handleChange('customerPhone', e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo de Solicitação</Label>
              <Select
                value={form.type}
                onValueChange={(value) => handleChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Descreva o motivo da solicitação"
            />
          </div>

          <div>
            <Label htmlFor="note">Observações (visíveis internamente)</Label>
            <Textarea
              id="note"
              value={form.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder="Use esta área para notas internas"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Solicitação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewReturnModal;
