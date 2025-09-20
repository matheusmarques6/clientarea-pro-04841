import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, DollarSign, ArrowLeft, Download, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface RefundStatus {
  id: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
  };
  status: 'SOLICITADO' | 'EM_ANALISE' | 'APROVADO' | 'PROCESSANDO' | 'CONCLUIDO' | 'RECUSADO';
  amount: {
    requested: number;
    approved?: number;
    currency: string;
  };
  method: {
    type: 'CARD' | 'PIX' | 'BOLETO' | 'VOUCHER';
    details?: string;
  };
  reason: {
    code: string;
    label: string;
  };
  timeline: Array<{
    status: string;
    description: string;
    timestamp: string;
    completed: boolean;
  }>;
  messages?: Array<{
    from: 'store' | 'customer';
    message: string;
    timestamp: string;
  }>;
  estimatedCompletion?: string;
  transactionId?: string;
  voucherCode?: string;
  rejectionReason?: string;
}

// Mock data
const mockRefundStatus: RefundStatus = {
  id: 'RB-3021',
  orderId: '#28471',
  customer: {
    name: 'Maria Silva',
    email: 'maria@email.com'
  },
  status: 'APROVADO',
  amount: {
    requested: 89.90,
    approved: 89.90,
    currency: 'BRL'
  },
  method: {
    type: 'PIX',
    details: 'maria@email.com'
  },
  reason: {
    code: 'ARREP',
    label: 'Arrependimento'
  },
  timeline: [
    {
      status: 'Solicitação criada',
      description: 'Sua solicitação de reembolso foi recebida e está sendo processada',
      timestamp: '2025-09-20T10:30:00Z',
      completed: true
    },
    {
      status: 'Em análise',
      description: 'Nossa equipe está analisando sua solicitação',
      timestamp: '2025-09-20T10:35:00Z',
      completed: true
    },
    {
      status: 'Aprovado',
      description: 'Sua solicitação foi aprovada e será processada em breve',
      timestamp: '2025-09-20T11:20:00Z',
      completed: true
    },
    {
      status: 'Processando pagamento',
      description: 'Estamos processando seu reembolso via PIX',
      timestamp: '',
      completed: false
    },
    {
      status: 'Concluído',
      description: 'Reembolso realizado com sucesso',
      timestamp: '',
      completed: false
    }
  ],
  messages: [
    {
      from: 'store',
      message: 'Sua solicitação foi aprovada! O reembolso será processado via PIX para a chave maria@email.com em até 1 dia útil.',
      timestamp: '2025-09-20T11:25:00Z'
    }
  ],
  estimatedCompletion: '2025-09-21T17:00:00Z'
};

const RefundStatus = () => {
  const { storeSlug, rid } = useParams();
  const [refundStatus, setRefundStatus] = useState<RefundStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      if (rid === 'RB-3021') {
        setRefundStatus(mockRefundStatus);
      }
      setIsLoading(false);
    }, 1000);
  }, [rid]);

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusIcon = (status: string, completed: boolean) => {
    if (!completed) {
      return <Clock className="h-5 w-5 text-muted-foreground" />;
    }

    switch (status) {
      case 'Concluído':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Recusado':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getStatusColor = (status: RefundStatus['status']) => {
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

  const getMethodLabel = (method: RefundStatus['method']) => {
    const labels = {
      'CARD': 'Cartão de Crédito',
      'PIX': 'PIX',
      'BOLETO': 'Boleto Bancário',
      'VOUCHER': 'Vale-compra'
    };
    
    let label = labels[method.type] || method.type;
    
    if (method.details) {
      label += ` (${method.details})`;
    }
    
    return label;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!refundStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Protocolo não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              Verifique se o protocolo {rid} está correto.
            </p>
            <Link to={`/refunds/${storeSlug}`}>
              <Button>
                Fazer nova solicitação
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nextStep = refundStatus.timeline.find(step => !step.completed);
  const currentStepIndex = refundStatus.timeline.findIndex(step => !step.completed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to={`/refunds/${storeSlug}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nova solicitação
              </Button>
            </Link>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Status do Reembolso
            </h1>
            <p className="text-gray-600">
              Acompanhe o andamento da sua solicitação
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Protocolo {refundStatus.id}</span>
                  <Badge className={getStatusColor(refundStatus.status)}>
                    {refundStatus.status.replace('_', ' ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pedido:</span>
                    <div className="font-medium">{refundStatus.orderId}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <div className="font-medium">{refundStatus.customer.name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Motivo:</span>
                    <div className="font-medium">{refundStatus.reason.label}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Método:</span>
                    <div className="font-medium">{getMethodLabel(refundStatus.method)}</div>
                  </div>
                </div>

                {nextStep && refundStatus.estimatedCompletion && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Próxima etapa:</span>
                    </div>
                    <div className="text-blue-700 text-sm">
                      {nextStep.description}
                    </div>
                    <div className="text-blue-600 text-xs mt-1">
                      Previsão: {formatDate(refundStatus.estimatedCompletion)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Andamento da Solicitação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {refundStatus.timeline.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        {getStatusIcon(step.status, step.completed)}
                        {index < refundStatus.timeline.length - 1 && (
                          <div className={`w-0.5 h-8 mt-2 ${
                            step.completed ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-semibold ${
                            step.completed ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {step.status}
                          </h4>
                          {step.timestamp && (
                            <span className="text-sm text-muted-foreground">
                              {formatDate(step.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${
                          step.completed ? 'text-muted-foreground' : 'text-muted-foreground/70'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Messages from Store */}
            {refundStatus.messages && refundStatus.messages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Mensagens da Loja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {refundStatus.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          message.from === 'store' 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="text-sm">{message.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(message.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Frequentes</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="timing">
                    <AccordionTrigger>Quanto tempo demora o reembolso?</AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1">
                        <li>• <strong>PIX:</strong> 1-2 dias úteis após aprovação</li>
                        <li>• <strong>Cartão:</strong> 5-10 dias úteis após aprovação</li>
                        <li>• <strong>Vale-compra:</strong> Imediato após aprovação</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="changes">
                    <AccordionTrigger>Posso alterar o método de reembolso?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        Alterações podem ser feitas apenas antes da aprovação. 
                        Após aprovado, o método não pode ser alterado.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="contact">
                    <AccordionTrigger>Como entrar em contato?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        Entre em contato conosco através do e-mail suporte@loja.com 
                        ou WhatsApp (11) 99999-9999. Tenha seu protocolo em mãos.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Amount Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Valor solicitado</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(refundStatus.amount.requested)}
                  </div>
                </div>

                {refundStatus.amount.approved && (
                  <div>
                    <div className="text-sm text-muted-foreground">Valor aprovado</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(refundStatus.amount.approved)}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <div className="text-sm text-muted-foreground">Método</div>
                  <div className="font-medium">{getMethodLabel(refundStatus.method)}</div>
                </div>

                {refundStatus.transactionId && (
                  <div>
                    <div className="text-sm text-muted-foreground">ID da Transação</div>
                    <div className="font-mono text-sm">{refundStatus.transactionId}</div>
                  </div>
                )}

                {refundStatus.voucherCode && (
                  <div>
                    <div className="text-sm text-muted-foreground">Código do Vale</div>
                    <div className="font-mono text-lg font-bold">{refundStatus.voucherCode}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar comprovante
                </Button>
                
                <Button variant="outline" className="w-full" size="sm">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Entrar em contato
                </Button>

                <div className="pt-3 border-t">
                  <Link to={`/refunds/${storeSlug}`}>
                    <Button variant="outline" className="w-full" size="sm">
                      Nova solicitação
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Status Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>Solicitado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span>Em análise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Aprovado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Processando</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span>Concluído</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundStatus;