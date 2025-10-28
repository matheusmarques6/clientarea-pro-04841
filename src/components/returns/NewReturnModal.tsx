import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ReturnRequest } from '@/types';
import { RefundFields } from './RefundFields';
import { ItemsList, type RefundItem } from './ItemsList';
import { AttachmentUploader } from './AttachmentUploader';
import {
  generateRefundProtocol,
  calculateRiskScore,
  getInitialStatus,
  validateRefundFields,
} from '@/lib/refundUtils';

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

  // Campos específicos de reembolso
  const [refundFields, setRefundFields] = useState<{
    method: 'CARD' | 'PIX' | 'BOLETO' | 'VOUCHER';
    items: RefundItem[];
    attachments: File[];
  }>({
    method: 'PIX',
    items: [],
    attachments: [],
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
    setRefundFields({
      method: 'PIX',
      items: [],
      attachments: [],
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId) return;

    // Se for reembolso, usar lógica específica
    if (form.type === 'refund') {
      await handleRefundSubmit();
    } else {
      await handleNormalSubmit();
    }
  };

  const handleRefundSubmit = async () => {
    // Validar campos específicos de reembolso
    const validationError = validateRefundFields({
      orderCode: form.orderCode,
      customerName: form.customerName,
      amount: Number(form.amount),
      method: refundFields.method,
      hasItems: refundFields.items.length > 0,
    });

    if (validationError) {
      toast({
        title: 'Campos obrigatórios',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Gerar protocolo
      const protocol = generateRefundProtocol();

      // 2. Calcular risk score
      const riskScore = calculateRiskScore({
        amount: Number(form.amount),
        hasAttachments: refundFields.attachments.length > 0,
        hasItems: refundFields.items.length > 0,
      });

      // 3. Determinar status inicial
      const initialStatus = getInitialStatus(riskScore, Number(form.amount));

      // 4. Inserir reembolso no banco
      const { data: refund, error } = await supabase
        .from('returns')
        .insert({
          store_id: storeId,
          protocol,
          order_code: form.orderCode.trim(),
          customer_name: form.customerName.trim(),
          customer_email: form.customerEmail.trim() || null,
          customer_phone: form.customerPhone.trim() || null,
          type: 'refund',
          method: refundFields.method,
          requested_amount: Number(form.amount),
          reason: form.reason.trim() || null,
          status: initialStatus,
          risk_score: riskScore,
          origin: 'internal',
          notes: form.note.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // 5. Inserir items
      if (refundFields.items.length > 0) {
        const itemsPayload = refundFields.items.map((item) => ({
          return_id: refund.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
        }));

        const { error: itemsError } = await supabase.from('return_items').insert(itemsPayload);

        if (itemsError) {
          console.error('Error inserting items:', itemsError);
        }
      }

      // 6. Upload de anexos (se houver)
      if (refundFields.attachments.length > 0) {
        try {
          const uploadPromises = refundFields.attachments.map(async (file) => {
            const filePath = `${storeId}/${refund.id}/${Date.now()}-${file.name}`;

            const { error: uploadError } = await supabase.storage
              .from('refund-attachments')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            return filePath;
          });

          await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error('Error uploading attachments:', uploadError);
          // Não falhar a criação por causa de erro no upload
        }
      }

      // 7. Criar evento inicial na timeline
      await supabase.from('return_events').insert({
        return_id: refund.id,
        action: 'created',
        description: 'Solicitação de reembolso criada',
        user: 'Sistema',
      });

      toast({
        title: 'Reembolso criado',
        description: `Protocolo ${protocol} criado com sucesso. Risk Score: ${riskScore}%`,
      });

      if (onCreated) {
        onCreated(refund as ReturnRequest);
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating refund:', error);
      toast({
        title: 'Erro ao criar reembolso',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNormalSubmit = async () => {
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

  const isRefund = form.type === 'refund';

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
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
              {!isRefund && (
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
              )}
            </div>

            {/* Campos específicos de reembolso */}
            {isRefund && (
              <div className="space-y-4">
                <RefundFields
                  method={refundFields.method}
                  onMethodChange={(method) =>
                    setRefundFields((prev) => ({ ...prev, method }))
                  }
                />

                <ItemsList
                  items={refundFields.items}
                  onChange={(items) => setRefundFields((prev) => ({ ...prev, items }))}
                  onTotalChange={(total) => handleChange('amount', total.toString())}
                />

                <AttachmentUploader
                  files={refundFields.attachments}
                  onChange={(attachments) =>
                    setRefundFields((prev) => ({ ...prev, attachments }))
                  }
                />
              </div>
            )}

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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NewReturnModal;
