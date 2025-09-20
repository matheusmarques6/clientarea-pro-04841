import React, { useState } from 'react';
import { X, Download, Eye, CheckCircle, XCircle, Clock, DollarSign, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface RefundItem {
  id: string;
  protocol: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  requestedAmount: number;
  finalAmount?: number;
  method: 'CARD' | 'PIX' | 'BOLETO' | 'VOUCHER';
  reason: string;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  riskScore: number;
  createdAt: string;
  updatedAt: string;
  attachments: string[];
  timeline: Array<{
    id: string;
    timestamp: string;
    action: string;
    description: string;
    user: string;
  }>;
}

interface RefundDetailsModalProps {
  refund: RefundItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (refundId: string, newStatus: RefundItem['status']) => void;
}

export const RefundDetailsModal: React.FC<RefundDetailsModalProps> = ({
  refund,
  isOpen,
  onClose,
  onStatusUpdate
}) => {
  const { toast } = useToast();
  const [finalAmount, setFinalAmount] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [voucherCode, setVoucherCode] = useState('');

  if (!refund) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusColor = (status: RefundItem['status']) => {
    switch (status) {
      case 'REQUESTED': return 'bg-blue-100 text-blue-800';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PROCESSING': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodLabel = (method: string) => {
    const methods = {
      'CARD': 'Cartão',
      'PIX': 'PIX',
      'BOLETO': 'Boleto',
      'VOUCHER': 'Vale-compra'
    };
    return methods[method as keyof typeof methods] || method;
  };

  const handleApprove = () => {
    onStatusUpdate(refund.id, 'APPROVED');
    toast({
      title: "Reembolso aprovado",
      description: "O reembolso foi aprovado com sucesso",
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo da rejeição",
        variant: "destructive"
      });
      return;
    }
    onStatusUpdate(refund.id, 'REJECTED');
  };

  const handleStartProcessing = () => {
    onStatusUpdate(refund.id, 'PROCESSING');
  };

  const handleMarkAsPaid = () => {
    onStatusUpdate(refund.id, 'COMPLETED');
  };

  const canApprove = refund.status === 'REQUESTED' || refund.status === 'UNDER_REVIEW';
  const canReject = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED'].includes(refund.status);
  const canStartProcessing = refund.status === 'APPROVED';
  const canMarkAsPaid = refund.status === 'PROCESSING';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Reembolso {refund.protocol}</span>
            <Badge className={getStatusColor(refund.status)}>
              {refund.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Informações do Cliente</h3>
              <div className="space-y-2">
                <p><strong>Nome:</strong> {refund.customer.name}</p>
                <p><strong>E-mail:</strong> {refund.customer.email}</p>
                {refund.customer.phone && (
                  <p><strong>Telefone:</strong> {refund.customer.phone}</p>
                )}
                <p><strong>Pedido:</strong> {refund.orderId}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Itens</h3>
              <div className="space-y-3">
                {refund.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        <p className="text-sm">
                          Qtd: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Motivo</h3>
              <p className="text-sm bg-muted p-3 rounded-lg">{refund.reason}</p>
            </div>

            {/* Attachments */}
            {refund.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Anexos</h3>
                <div className="space-y-2">
                  {refund.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm">{attachment}</span>
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Financial Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Informações Financeiras</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Valor solicitado:</span>
                  <span className="font-bold">{formatCurrency(refund.requestedAmount)}</span>
                </div>
                {refund.finalAmount && (
                  <div className="flex justify-between">
                    <span>Valor aprovado:</span>
                    <span className="font-bold text-green-600">{formatCurrency(refund.finalAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Método:</span>
                  <span>{getMethodLabel(refund.method)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Risk Score:</span>
                  <span className={`font-medium ${
                    refund.riskScore > 70 ? 'text-red-600' : 
                    refund.riskScore > 40 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {refund.riskScore}%
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Ações</h3>
              <div className="space-y-3">
                {canApprove && (
                  <Button onClick={handleApprove} className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                )}
                
                {canReject && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motivo da rejeição..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <Button variant="destructive" onClick={handleReject} className="w-full">
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                )}

                {canStartProcessing && (
                  <Button onClick={handleStartProcessing} className="w-full">
                    <Clock className="w-4 h-4 mr-2" />
                    Iniciar Processamento
                  </Button>
                )}

                {canMarkAsPaid && (
                  <Button onClick={handleMarkAsPaid} className="w-full">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Marcar como Pago
                  </Button>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Histórico</h3>
              <div className="space-y-3">
                {refund.timeline.map((event) => (
                  <div key={event.id} className="border-l-2 border-primary pl-3 pb-3">
                    <p className="font-medium">{event.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.timestamp)} • {event.user}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};