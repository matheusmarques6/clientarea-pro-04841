import { useState } from 'react';
import { Search, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface TrackingStep {
  status: string;
  description: string;
  timestamp: string;
  completed: boolean;
}

interface TrackingInfo {
  protocol: string;
  type: 'Troca' | 'Devolução';
  status: string;
  customer: string;
  orderNumber: string;
  steps: TrackingStep[];
  nextAction?: string;
  trackingCode?: string;
}

const TrackingPortal = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock tracking data
  const mockTrackings: { [key: string]: TrackingInfo } = {
    'TR-123456': {
      protocol: 'TR-123456',
      type: 'Troca',
      status: 'Aguardando postagem',
      customer: 'Maria Silva',
      orderNumber: '#28471',
      trackingCode: 'BR123456789',
      nextAction: 'Poste o pacote com a etiqueta fornecida',
      steps: [
        {
          status: 'Solicitação criada',
          description: 'Solicitação de troca criada via portal público',
          timestamp: '2025-09-18T10:30:00Z',
          completed: true
        },
        {
          status: 'Aprovada automaticamente',
          description: 'Solicitação aprovada automaticamente pelo sistema',
          timestamp: '2025-09-18T10:32:00Z',
          completed: true
        },
        {
          status: 'Etiqueta gerada',
          description: 'Etiqueta de devolução enviada por e-mail',
          timestamp: '2025-09-18T10:35:00Z',
          completed: true
        },
        {
          status: 'Aguardando postagem',
          description: 'Aguardando postagem do produto pelos Correios',
          timestamp: '',
          completed: false
        },
        {
          status: 'Em trânsito',
          description: 'Produto postado e em trânsito para nosso CD',
          timestamp: '',
          completed: false
        },
        {
          status: 'Recebido no CD',
          description: 'Produto recebido e inspecionado',
          timestamp: '',
          completed: false
        },
        {
          status: 'Concluído',
          description: 'Novo produto enviado / Vale-troca emitido',
          timestamp: '',
          completed: false
        }
      ]
    },
    'DV-789012': {
      protocol: 'DV-789012',
      type: 'Devolução',
      status: 'Concluído',
      customer: 'João Santos',
      orderNumber: '#28502',
      trackingCode: 'BR987654321',
      steps: [
        {
          status: 'Solicitação criada',
          description: 'Solicitação de devolução criada via portal público',
          timestamp: '2025-09-15T14:20:00Z',
          completed: true
        },
        {
          status: 'Em análise',
          description: 'Solicitação em análise pela equipe',
          timestamp: '2025-09-15T14:25:00Z',
          completed: true
        },
        {
          status: 'Aprovada',
          description: 'Solicitação aprovada após análise',
          timestamp: '2025-09-16T09:10:00Z',
          completed: true
        },
        {
          status: 'Etiqueta gerada',
          description: 'Etiqueta de devolução enviada por e-mail',
          timestamp: '2025-09-16T09:15:00Z',
          completed: true
        },
        {
          status: 'Em trânsito',
          description: 'Produto postado e em trânsito para nosso CD',
          timestamp: '2025-09-17T08:30:00Z',
          completed: true
        },
        {
          status: 'Recebido no CD',
          description: 'Produto recebido e inspecionado',
          timestamp: '2025-09-18T11:20:00Z',
          completed: true
        },
        {
          status: 'Concluído',
          description: 'Reembolso processado - estorno em até 5 dias úteis',
          timestamp: '2025-09-18T14:45:00Z',
          completed: true
        }
      ]
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite o protocolo da solicitação",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Simular busca
    setTimeout(() => {
      const result = mockTrackings[searchTerm.toUpperCase()];
      
      if (result) {
        setTracking(result);
      } else {
        toast({
          title: "Protocolo não encontrado",
          description: "Verifique se o protocolo está correto",
          variant: "destructive"
        });
        setTracking(null);
      }
      
      setIsLoading(false);
    }, 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Concluído':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Recusado':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'Em trânsito':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'Aguardando postagem':
        return <Package className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído':
        return 'bg-green-100 text-green-800';
      case 'Recusado':
        return 'bg-red-100 text-red-800';
      case 'Em trânsito':
        return 'bg-blue-100 text-blue-800';
      case 'Aguardando postagem':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-[100svh] sm:min-h-[100dvh] bg-gradient-to-br from-background via-background to-muted/50 grid place-items-center px-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Acompanhar Solicitação
          </h1>
          <p className="text-muted-foreground">
            Digite o protocolo para acompanhar sua troca ou devolução
          </p>
        </div>

        <Card className="glass-card mb-8">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="protocol" className="text-foreground">Protocolo da Solicitação</Label>
                <Input
                  id="protocol"
                  placeholder="Ex: TR-123456 ou DV-789012"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-foreground"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Digite o protocolo que você recebeu por e-mail
                </p>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSearch} 
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {tracking && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {getStatusIcon(tracking.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span>Protocolo: {tracking.protocol}</span>
                      <Badge className={getStatusColor(tracking.status)}>
                        {tracking.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-normal">
                      {tracking.type} • Pedido {tracking.orderNumber} • {tracking.customer}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tracking.nextAction && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-800 mb-1">Próxima Ação:</h4>
                    <p className="text-blue-700 text-sm">{tracking.nextAction}</p>
                  </div>
                )}
                
                {tracking.trackingCode && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Código de Rastreio:</h4>
                    <Badge variant="outline" className="font-mono text-base">
                      {tracking.trackingCode}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use este código para rastrear no site dos Correios
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Histórico da Solicitação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tracking.steps.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          step.completed ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        {index < tracking.steps.length - 1 && (
                          <div className={`w-0.5 h-8 ${
                            tracking.steps[index + 1].completed ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
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
          </div>
        )}

        {tracking && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda? Entre em contato conosco através do suporte
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingPortal;