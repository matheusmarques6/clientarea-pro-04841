import { useState } from 'react';
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
  storeId: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    lineId: string;
    sku: string;
    title: string;
    qty: number;
    price: number;
    currency: string;
  }>;
  reason: {
    code: 'ARREP' | 'DEFEITO' | 'DANIFICADO' | 'ERRADO' | 'NAO_RECEBI' | 'OUTRO';
    note?: string;
  };
  attachments: string[];
  requestedAmount: {
    value: number;
    currency: string;
  };
  finalAmount?: {
    value: number;
    currency: string;
  };
  method: {
    type: 'CARD' | 'PIX' | 'BOLETO' | 'VOUCHER';
    pixKey?: string;
    pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  };
  status: 'SOLICITADO' | 'EM_ANALISE' | 'APROVADO' | 'PROCESSANDO' | 'CONCLUIDO' | 'RECUSADO';
  riskScore: number;
  timeline: Array<{
    at: string;
    event: string;
    meta?: any;
    by: 'system' | 'user' | 'agent';
  }>;
  transactionId?: string;
  voucherCode?: string;
  publicUrl: string;
  createdAt: string;
}

interface RefundDetailsModalProps {
  refund: RefundItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (refundId: string, newStatus: RefundItem['status'], finalAmount?: number) => void;
}

export const RefundDetailsModal = ({ refund, isOpen, onClose, onStatusUpdate }: RefundDetailsModalProps) => {
  const { toast } = useToast();
  const [finalAmount, setFinalAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [voucherCode, setVoucherCode] = useState('');

  if (!refund) return null;

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getReasonLabel = (code: string) => {
    const reasons = {
      'ARREP': 'Arrependimento',
      'DEFEITO': 'Defeito',
      'DANIFICADO': 'Danificado',
      'ERRADO': 'Produto errado',
      'NAO_RECEBI': 'Não recebi',
      'OUTRO': 'Outro'
    };
    return reasons[code as keyof typeof reasons] || code;
  };

  const getMethodLabel = (method: RefundItem['method']) => {
    const labels = {
      'CARD': 'Cartão de Crédito',
      'PIX': 'PIX',
      'BOLETO': 'Boleto Bancário',
      'VOUCHER': 'Vale-compra'
    };
    
    let label = labels[method.type] || method.type;
    
    if (method.type === 'PIX' && method.pixKey) {
      label += ` (${method.pixKey})`;
    }
    
    return label;
  };

  const getStatusColor = (status: RefundItem['status']) => {
    switch (status) {
      case 'SOLICITADO': return 'bg-gray-100 text-gray-800';
      case 'EM_ANALISE': return 'bg-yellow-100 text-yellow-800';
      case 'APROVADO': return 'bg-green-100 text-green-800';
      case 'PROCESSANDO': return 'bg-blue-100 text-blue-800';
      case 'CONCLUIDO': return 'bg-emerald-100 text-emerald-800';
      case 'RECUSADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = () => {
    const amount = finalAmount ? parseFloat(finalAmount) : refund.requestedAmount.value;
    
    if (amount <= 0 || amount > refund.requestedAmount.value) {
      toast({
        title: "Valor inválido",
        description: "O valor final deve ser maior que 0 e menor ou igual ao valor solicitado",
        variant: "destructive"
      });
      return;
    }

    onStatusUpdate(refund.id, 'APROVADO', amount);
    toast({
      title: "Reembolso aprovado",
      description: `Reembolso ${refund.id} aprovado por ${formatCurrency(amount)}`
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo da recusa",
        variant: "destructive"
      });
      return;
    }

    onStatusUpdate(refund.id, 'RECUSADO');
    toast({
      title: "Reembolso recusado",
      description: `Reembolso ${refund.id} foi recusado`
    });
  };

  const handleStartProcessing = () => {
    onStatusUpdate(refund.id, 'PROCESSANDO');
    toast({
      title: "Processamento iniciado",
      description: `Iniciado o processamento do pagamento para ${refund.id}`
    });
  };

  const handleMarkAsPaid = () => {
    if (refund.method.type !== 'VOUCHER' && !transactionId.trim()) {
      toast({
        title: "ID da transação obrigatório",
        description: "Informe o ID da transação para pagamentos via cartão/PIX/boleto",
        variant: "destructive"
      });
      return;
    }

    if (refund.method.type === 'VOUCHER' && !voucherCode.trim()) {
      toast({
        title: "Código do vale obrigatório",
        description: "Informe o código do vale-compra gerado",
        variant: "destructive"
      });
      return;
    }

    onStatusUpdate(refund.id, 'CONCLUIDO');
    toast({
      title: "Reembolso concluído",
      description: `Reembolso ${refund.id} marcado como pago/concluído`
    });
  };

  const handleRevert = () => {
    // Lógica para reverter uma etapa (voltar um status)
    const statusFlow = ['SOLICITADO', 'EM_ANALISE', 'APROVADO', 'PROCESSANDO', 'CONCLUIDO'];
    const currentIndex = statusFlow.indexOf(refund.status);
    
    if (currentIndex > 0) {
      const previousStatus = statusFlow[currentIndex - 1] as RefundItem['status'];
      onStatusUpdate(refund.id, previousStatus);
      toast({
        title: "Etapa revertida",
        description: `Status voltou para ${previousStatus}`
      });
    }
  };

  const canApprove = ['SOLICITADO', 'EM_ANALISE'].includes(refund.status);
  const canReject = ['SOLICITADO', 'EM_ANALISE', 'APROVADO'].includes(refund.status);
  const canStartProcessing = refund.status === 'APROVADO';
  const canMarkAsPaid = refund.status === 'PROCESSANDO';
  const canRevert = !['SOLICITADO', 'CONCLUIDO', 'RECUSADO'].includes(refund.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Reembolso {refund.id}</span>
            <Badge className={getStatusColor(refund.status)}>
              {refund.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Main Info */}
          <div className="space-y-6">
            {/* Customer & Order Info */}
            <div>
              <h3 className="font-semibold mb-3">Informações do Pedido</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Pedido:</strong> {refund.orderId}</div>
                <div><strong>Cliente:</strong> {refund.customer.name}</div>
                <div><strong>E-mail:</strong> {refund.customer.email}</div>
                {refund.customer.phone && (
                  <div><strong>Telefone:</strong> {refund.customer.phone}</div>
                )}
                <div><strong>Data da solicitação:</strong> {formatDate(refund.createdAt)}</div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h3 className="font-semibold mb-3">Itens Solicitados</h3>
              <div className="space-y-3">
                {refund.items.map((item, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      SKU: {item.sku} • Quantidade: {item.qty}
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Reason & Attachments */}
            <div>
              <h3 className="font-semibold mb-3">Motivo & Evidências</h3>
              <div className="space-y-3">
                <div>
                  <strong>Motivo:</strong> {getReasonLabel(refund.reason.code)}
                </div>
                {refund.reason.note && (
                  <div>
                    <strong>Observação:</strong>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {refund.reason.note}
                    </div>
                  </div>
                )}
                {refund.attachments.length > 0 && (
                  <div>
                    <strong>Anexos ({refund.attachments.length}):</strong>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {refund.attachments.map((attachment, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="h-8"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {attachment}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Actions & Timeline */}
          <div className="space-y-6">
            {/* Financial Info */}
            <div>
              <h3 className="font-semibold mb-3">Valores & Pagamento</h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-700">Valor solicitado</div>
                  <div className="text-lg font-bold text-green-800">
                    {formatCurrency(refund.requestedAmount.value)}
                  </div>
                </div>
                
                {refund.finalAmount && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-700">Valor aprovado</div>
                    <div className="text-lg font-bold text-blue-800">
                      {formatCurrency(refund.finalAmount.value)}
                    </div>
                  </div>
                )}

                <div>
                  <strong>Método:</strong> {getMethodLabel(refund.method)}
                </div>

                <div className={`p-2 rounded text-sm ${
                  refund.riskScore > 70 ? 'bg-red-50 text-red-800' :
                  refund.riskScore > 40 ? 'bg-yellow-50 text-yellow-800' :
                  'bg-green-50 text-green-800'
                }`}>
                  <strong>Score de risco:</strong> {refund.riskScore}/100
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div>
              <h3 className="font-semibold mb-3">Ações</h3>
              <div className="space-y-4">
                {/* Approve */}
                {canApprove && (
                  <div className="space-y-2">
                    <Label htmlFor="finalAmount">Valor final (opcional)</Label>
                    <Input
                      id="finalAmount"
                      type="number"
                      step="0.01"
                      placeholder={`Máximo: ${refund.requestedAmount.value}`}
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(e.target.value)}
                    />
                    <Button 
                      onClick={handleApprove}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar Reembolso
                    </Button>
                  </div>
                )}

                {/* Start Processing */}
                {canStartProcessing && (
                  <Button 
                    onClick={handleStartProcessing}
                    className="w-full"
                    variant="default"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Iniciar Processamento
                  </Button>
                )}

                {/* Mark as Paid */}
                {canMarkAsPaid && (
                  <div className="space-y-2">
                    {refund.method.type === 'VOUCHER' ? (
                      <>
                        <Label htmlFor="voucherCode">Código do Vale</Label>
                        <Input
                          id="voucherCode"
                          placeholder="Ex: VALE123456"
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value)}
                        />
                      </>
                    ) : (
                      <>
                        <Label htmlFor="transactionId">ID da Transação</Label>
                        <Input
                          id="transactionId"
                          placeholder="Ex: TXN123456789"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                        />
                      </>
                    )}
                    <Button 
                      onClick={handleMarkAsPaid}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Pago
                    </Button>
                  </div>
                )}

                {/* Reject */}
                {canReject && (
                  <div className="space-y-2">
                    <Label htmlFor="rejectReason">Motivo da recusa</Label>
                    <Textarea
                      id="rejectReason"
                      placeholder="Explique o motivo da recusa..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <Button 
                      onClick={handleReject}
                      variant="destructive"
                      className="w-full"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Recusar Reembolso
                    </Button>
                  </div>
                )}

                {/* Revert */}
                {canRevert && (
                  <Button 
                    onClick={handleRevert}
                    variant="outline"
                    className="w-full"
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Reverter Etapa
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <h3 className="font-semibold mb-3">Timeline</h3>
              <div className="space-y-3">
                {refund.timeline.map((event, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{event.event}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(event.at)} • Por {event.by === 'system' ? 'Sistema' : event.by === 'user' ? 'Cliente' : 'Agente'}
                      </div>
                    </div>
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