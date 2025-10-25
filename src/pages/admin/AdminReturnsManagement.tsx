import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  DollarSign,
  Search,
  Eye,
  Filter,
  ArrowUpRight,
  Calendar,
  User,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';

interface ReturnRequest {
  id: string;
  code: string;
  store_id: string;
  type: 'return' | 'exchange';
  status: string;
  customer_name: string;
  customer_email: string;
  order_code: string;
  tracking_code?: string;
  tracking_carrier?: string;
  refund_amount?: number;
  created_at: string;
  updated_at: string;
  stores?: {
    name: string;
  };
}

interface RequestItem {
  id: string;
  product_name: string;
  variant_title?: string;
  quantity: number;
  image_url?: string;
  reason?: string;
}

const AdminReturnsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [requestEvents, setRequestEvents] = useState<any[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');

  // Label generation state
  const [labelCarrier, setLabelCarrier] = useState<'correios' | 'fedex' | 'dhl' | 'ups'>('correios');
  const [labelService, setLabelService] = useState('SEDEX');
  const [packageWeight, setPackageWeight] = useState('1');
  const [packageLength, setPackageLength] = useState('30');
  const [packageWidth, setPackageWidth] = useState('20');
  const [packageHeight, setPackageHeight] = useState('10');

  // Refund state
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [restockItems, setRestockItems] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rm_requests')
        .select(`
          *,
          stores (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as solicitações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (requestId: string) => {
    try {
      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('rm_request_items')
        .select('*')
        .eq('request_id', requestId);

      if (itemsError) throw itemsError;
      setRequestItems(items || []);

      // Fetch events
      const { data: events, error: eventsError } = await supabase
        .from('rm_request_events')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;
      setRequestEvents(events || []);
    } catch (error) {
      console.error('Error fetching request details:', error);
    }
  };

  const handleViewDetails = async (request: ReturnRequest) => {
    setSelectedRequest(request);
    await fetchRequestDetails(request.id);
    setIsDetailsOpen(true);
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from('rm_requests')
        .update({ status: 'approved' })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      await supabase
        .from('rm_request_events')
        .insert({
          request_id: selectedRequest.id,
          event_type: 'status_changed',
          description: `Solicitação aprovada${actionReason ? `: ${actionReason}` : ''}`,
        });

      toast({
        title: 'Solicitação aprovada',
        description: 'A solicitação foi aprovada com sucesso'
      });

      setIsApproveOpen(false);
      setIsDetailsOpen(false);
      setActionReason('');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar a solicitação',
        variant: 'destructive'
      });
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !actionReason) {
      toast({
        title: 'Erro',
        description: 'Por favor, informe o motivo da recusa',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rm_requests')
        .update({ status: 'rejected' })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      await supabase
        .from('rm_request_events')
        .insert({
          request_id: selectedRequest.id,
          event_type: 'status_changed',
          description: `Solicitação recusada: ${actionReason}`,
        });

      toast({
        title: 'Solicitação recusada',
        description: 'A solicitação foi recusada'
      });

      setIsRejectOpen(false);
      setIsDetailsOpen(false);
      setActionReason('');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível recusar a solicitação',
        variant: 'destructive'
      });
    }
  };

  const handleGenerateLabel = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-shipping-label`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            request_id: selectedRequest.id,
            carrier: labelCarrier,
            service_level: labelService,
            package_weight: parseFloat(packageWeight),
            package_dimensions: {
              length: parseFloat(packageLength),
              width: parseFloat(packageWidth),
              height: parseFloat(packageHeight),
            },
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao gerar etiqueta');
      }

      toast({
        title: 'Etiqueta gerada',
        description: `Código de rastreamento: ${data.data.tracking_code}`
      });

      setIsLabelOpen(false);
      setIsDetailsOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error generating label:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível gerar a etiqueta',
        variant: 'destructive'
      });
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedRequest || !refundAmount) {
      toast({
        title: 'Erro',
        description: 'Por favor, informe o valor do reembolso',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-refund`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            request_id: selectedRequest.id,
            refund_amount: parseFloat(refundAmount),
            refund_reason: refundReason,
            notify_customer: notifyCustomer,
            restock_items: restockItems,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar reembolso');
      }

      toast({
        title: 'Reembolso processado',
        description: `Valor: ${data.data.currency} ${data.data.amount}`
      });

      setIsRefundOpen(false);
      setIsDetailsOpen(false);
      setRefundAmount('');
      setRefundReason('');
      fetchRequests();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível processar o reembolso',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      approved: { label: 'Aprovado', variant: 'default' },
      rejected: { label: 'Recusado', variant: 'destructive' },
      label_pending: { label: 'Etiqueta Pendente', variant: 'secondary' },
      label_generated: { label: 'Etiqueta Gerada', variant: 'default' },
      shipped: { label: 'Enviado', variant: 'default' },
      item_received: { label: 'Item Recebido', variant: 'default' },
      refund_pending: { label: 'Reembolso Pendente', variant: 'secondary' },
      refunded: { label: 'Reembolsado', variant: 'default' },
      completed: { label: 'Concluído', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.order_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando solicitações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Trocas & Devoluções</h1>
          <p className="text-muted-foreground mt-1">
            Sistema completo de gestão de solicitações com integração Shopify
          </p>
        </div>
        <Button onClick={fetchRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Todas as solicitações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Em processamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, cliente, email ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Recusado</SelectItem>
                <SelectItem value="label_generated">Etiqueta Gerada</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-4 text-left font-medium">Código</th>
                  <th className="p-4 text-left font-medium">Loja</th>
                  <th className="p-4 text-left font-medium">Cliente</th>
                  <th className="p-4 text-left font-medium">Pedido</th>
                  <th className="p-4 text-left font-medium">Tipo</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium">Data</th>
                  <th className="p-4 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <span className="font-mono text-sm font-medium">{request.code}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{request.stores?.name || '-'}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-sm">{request.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{request.customer_email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{request.order_code}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={request.type === 'return' ? 'outline' : 'secondary'}>
                        {request.type === 'return' ? 'Devolução' : 'Troca'}
                      </Badge>
                    </td>
                    <td className="p-4">{getStatusBadge(request.status)}</td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              {selectedRequest?.code} - {selectedRequest?.type === 'return' ? 'Devolução' : 'Troca'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Customer & Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{selectedRequest.customer_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedRequest.customer_email}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{selectedRequest.order_code}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Loja: {selectedRequest.stores?.name}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tracking Info */}
              {selectedRequest.tracking_code && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Rastreamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{selectedRequest.tracking_code}</span>
                      <Badge variant="outline">{selectedRequest.tracking_carrier?.toUpperCase()}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Itens da Solicitação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requestItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-4 p-3 border rounded-lg">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.product_name} className="w-16 h-16 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product_name}</p>
                          {item.variant_title && (
                            <p className="text-xs text-muted-foreground">{item.variant_title}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">Quantidade: {item.quantity}</p>
                          {item.reason && (
                            <p className="text-xs text-muted-foreground mt-1">Motivo: {item.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Histórico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requestEvents.map((event, index) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {index < requestEvents.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium">{event.event_type}</p>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(event.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button variant="outline" onClick={() => setIsRejectOpen(true)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Recusar
                    </Button>
                    <Button onClick={() => setIsApproveOpen(true)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                  </>
                )}
                {(selectedRequest.status === 'approved' || selectedRequest.status === 'label_pending') && (
                  <Button onClick={() => setIsLabelOpen(true)}>
                    <Truck className="h-4 w-4 mr-2" />
                    Gerar Etiqueta
                  </Button>
                )}
                {(selectedRequest.status === 'approved' || selectedRequest.status === 'item_received' || selectedRequest.status === 'refund_pending') && (
                  <Button onClick={() => setIsRefundOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Processar Reembolso
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
            <DialogDescription>
              Confirme a aprovação da solicitação {selectedRequest?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Adicione observações sobre a aprovação..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApproveRequest}>
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa da solicitação {selectedRequest?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da recusa *</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Explique por que a solicitação está sendo recusada..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest}>
              Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Label Generation Dialog */}
      <Dialog open={isLabelOpen} onOpenChange={setIsLabelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Etiqueta de Envio</DialogTitle>
            <DialogDescription>
              Configure os detalhes da etiqueta para {selectedRequest?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Transportadora</Label>
                <Select value={labelCarrier} onValueChange={(v: any) => setLabelCarrier(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="correios">Correios</SelectItem>
                    <SelectItem value="fedex">FedEx</SelectItem>
                    <SelectItem value="dhl">DHL</SelectItem>
                    <SelectItem value="ups">UPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Serviço</Label>
                <Input
                  value={labelService}
                  onChange={(e) => setLabelService(e.target.value)}
                  placeholder="SEDEX, PAC, EXPRESS..."
                />
              </div>
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={packageWeight}
                onChange={(e) => setPackageWeight(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Comprimento (cm)</Label>
                <Input
                  type="number"
                  value={packageLength}
                  onChange={(e) => setPackageLength(e.target.value)}
                />
              </div>
              <div>
                <Label>Largura (cm)</Label>
                <Input
                  type="number"
                  value={packageWidth}
                  onChange={(e) => setPackageWidth(e.target.value)}
                />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  value={packageHeight}
                  onChange={(e) => setPackageHeight(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLabelOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateLabel}>
              Gerar Etiqueta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Processing Dialog */}
      <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processar Reembolso</DialogTitle>
            <DialogDescription>
              Configure os detalhes do reembolso para {selectedRequest?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor do Reembolso *</Label>
              <Input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Informe o motivo do reembolso..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notify"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="notify" className="cursor-pointer">
                Notificar cliente por email
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="restock"
                checked={restockItems}
                onChange={(e) => setRestockItems(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="restock" className="cursor-pointer">
                Devolver itens ao estoque
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleProcessRefund}>
              Processar Reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReturnsManagement;
