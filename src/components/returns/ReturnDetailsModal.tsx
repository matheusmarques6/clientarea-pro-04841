import { useState } from 'react';
import { X, Calendar, User, Package, FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReturnRequest } from '@/types';

interface ReturnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: ReturnRequest | null;
  onStatusUpdate?: (id: string, newStatus: ReturnRequest['status']) => void;
}

const ReturnDetailsModal = ({
  isOpen,
  onClose,
  returnRequest,
  onStatusUpdate
}: ReturnDetailsModalProps) => {
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [newNote, setNewNote] = useState('');

  if (!returnRequest) return null;

  const getStatusColor = (status: ReturnRequest['status']) => {
    const colors = {
      'Nova': 'bg-status-new text-white',
      'Em análise': 'bg-status-analysis text-white',
      'Aprovada': 'bg-status-approved text-white',
      'Aguardando postagem': 'bg-status-waiting text-white',
      'Recebida em CD': 'bg-status-received text-white',
      'Concluída': 'bg-status-completed text-white',
      'Recusada': 'bg-status-refused text-white'
    };
    return colors[status] || 'bg-muted';
  };

  const statusOptions: ReturnRequest['status'][] = [
    'Nova',
    'Em análise', 
    'Aprovada',
    'Aguardando postagem',
    'Recebida em CD',
    'Concluída',
    'Recusada'
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                Solicitação {returnRequest.id}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Pedido {returnRequest.pedido} • {returnRequest.cliente}
              </p>
            </div>
            <Badge className={getStatusColor(returnRequest.status)}>
              {returnRequest.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Informações Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Detalhes da Solicitação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <Badge variant="outline">{returnRequest.tipo}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Motivo:</span>
                  <span className="text-sm font-medium">{returnRequest.motivo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <span className="text-sm font-bold">R$ {returnRequest.valor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Origem:</span>
                  <span className="text-sm">{returnRequest.origem || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nome:</span>
                  <span className="text-sm font-medium">{returnRequest.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Criado em:</span>
                  <span className="text-sm">{formatDate(returnRequest.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Atualizado em:</span>
                  <span className="text-sm">{formatDate(returnRequest.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Observações */}
          {returnRequest.observacoes && (
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{returnRequest.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Atualizar Status */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Gerenciar Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={returnRequest.status}
                    onValueChange={(value) => {
                      if (onStatusUpdate) {
                        onStatusUpdate(returnRequest.id, value as ReturnRequest['status']);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Adicionar nota</label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Digite uma observação..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[40px]"
                    />
                    <Button 
                      size="sm" 
                      disabled={!newNote.trim()}
                      onClick={() => {
                        // Aqui implementaria a lógica de adicionar nota
                        setNewNote('');
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {returnRequest.timeline && returnRequest.timeline.length > 0 && (
            <Card className="glass-card">
              <Collapsible open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Histórico ({returnRequest.timeline.length})
                      </div>
                      {isTimelineOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-4">
                      {returnRequest.timeline.map((event, index) => (
                        <div key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-primary rounded-full flex-shrink-0"></div>
                            {index < returnRequest.timeline!.length - 1 && (
                              <div className="w-px h-6 bg-border mt-2"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">{event.action}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(event.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {event.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              por {event.user}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button>
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnDetailsModal;