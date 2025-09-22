import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Filter, Search, ExternalLink, Settings, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useReturns as useReturnsHook } from '@/hooks/useReturns';
import { useStores } from '@/hooks/useStores';
import type { ReturnRequest as UIReturn } from '@/types';
import ReturnDetailsModal from '@/components/returns/ReturnDetailsModal';

// Helpers: map DB codes to UI labels (PT) and back
const statusLabel = (status: string): UIReturn['status'] => {
  switch (status) {
    case 'new': return 'Nova';
    case 'review': return 'Em análise';
    case 'approved': return 'Aprovada';
    case 'awaiting_post': return 'Aguardando postagem';
    case 'received_dc': return 'Recebida em CD';
    case 'closed': return 'Concluída';
    case 'rejected': return 'Recusada';
    default: return (status as any) || 'Nova';
  }
};

const statusCode = (label: string): any => {
  switch (label) {
    case 'Nova': return 'new';
    case 'Em análise': return 'review';
    case 'Aprovada': return 'approved';
    case 'Aguardando postagem': return 'awaiting_post';
    case 'Recebida em CD': return 'received_dc';
    case 'Concluída': return 'closed';
    case 'Recusada': return 'rejected';
    default: return 'review';
  }
};

const originLabel = (origin?: string): 'Interna' | 'Link público' => {
  if (!origin) return 'Interna';
  if (origin === 'internal') return 'Interna';
  if (origin === 'public') return 'Link público';
  return 'Interna'; // fallback to ensure type safety
};

const Returns = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();

  const { returns: rawReturns, loading, refetch } = useReturnsHook(storeId as string);
  const { stores } = useStores();
  const store = stores.find((s) => s.id === storeId);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState<UIReturn | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Adapt DB rows to UI shape expected by the page and modal
  const uiReturns: UIReturn[] = useMemo(() => {
    return (rawReturns || []).map((r: any) => ({
      id: r.id,
      pedido: r.order_code,
      cliente: r.customer_name,
      tipo: r.type === 'exchange' ? 'Troca' : 'Devolução', // Map DB values to UI labels
      motivo: r.reason || 'Não informado',
      valor: Number(r.amount || 0),
      status: statusLabel(r.status),
      origem: originLabel(r.origin),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      timeline: (r.return_events || []).map((e: any) => ({
        id: e.id,
        timestamp: e.created_at,
        action: statusLabel(e.to_status),
        description: e.reason || 'Status alterado',
        user: e.user_id || 'Sistema',
      })),
    }));
  }, [rawReturns]);

  if (!store) {
    return <div>Loja não encontrada</div>;
  }

  const handleCopyPublicLink = () => {
    const publicLink = `${window.location.origin}/public/returns/${store.name.toLowerCase().replace(/\s+/g, '-')}`;
    navigator.clipboard.writeText(publicLink);
    toast({ title: 'Link copiado!', description: 'Link público copiado para a área de transferência' });
  };

  const handleReturnClick = (returnRequest: UIReturn) => {
    setSelectedReturn(returnRequest);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = (id: string, newStatusLabel: UIReturn['status']) => {
    // TODO: Implementar updateStatus quando o hook estiver completo
    setSelectedReturn((prev) => (prev ? { ...prev, status: newStatusLabel } : null));
    toast({ title: 'Status atualizado!', description: `Status alterado para: ${newStatusLabel}` });
  };

  // Columns using UI labels
  const columns = [
    { id: 'nova', title: 'Nova', status: 'Nova', color: 'bg-slate-200 text-slate-900 border-slate-300' },
    { id: 'analise', title: 'Em análise', status: 'Em análise', color: 'bg-yellow-200 text-yellow-900 border-yellow-300' },
    { id: 'aprovada', title: 'Aprovada', status: 'Aprovada', color: 'bg-green-200 text-green-900 border-green-300' },
    { id: 'postagem', title: 'Aguardando postagem', status: 'Aguardando postagem', color: 'bg-blue-200 text-blue-900 border-blue-300' },
    { id: 'recebida', title: 'Recebida em CD', status: 'Recebida em CD', color: 'bg-purple-200 text-purple-900 border-purple-300' },
    { id: 'concluida', title: 'Concluída', status: 'Concluída', color: 'bg-emerald-200 text-emerald-900 border-emerald-300' },
    { id: 'recusada', title: 'Recusada', status: 'Recusada', color: 'bg-red-200 text-red-900 border-red-300' },
  ].map((col) => ({ ...col, items: uiReturns.filter((r) => r.status === (col as any).status) }));

  const filteredColumns = columns.map((column) => ({
    ...column,
    items: column.items.filter(
      (item: UIReturn) =>
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  }));

  const statusCounts = {
    abertas: uiReturns.filter((r) => r.status === 'Nova').length,
    aprovadas: uiReturns.filter((r) => r.status === 'Aprovada').length,
    concluidas: uiReturns.filter((r) => r.status === 'Concluída').length,
    recusadas: uiReturns.filter((r) => r.status === 'Recusada').length,
    pendentes: uiReturns.filter((r) => ['Em análise', 'Aguardando postagem', 'Recebida em CD'].includes(r.status)).length,
  };

  const KanbanCard = ({ item }: { item: UIReturn }) => (
    <Card className="bg-white border border-border shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer group" onClick={() => handleReturnClick(item)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-brand-600 text-sm">{item.id}</p>
            <p className="text-xs text-ink-3">{item.pedido}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="h-3 w-3 text-ink-3" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-ink-3" />
          <span className="text-sm font-medium text-ink">{item.cliente}</span>
        </div>

        <div className="space-y-2">
          <Badge className="bg-warning/10 text-warning border-warning/20 text-xs font-medium px-2 py-0.5">{item.tipo}</Badge>
          <p className="text-xs text-ink-2 leading-relaxed">Motivo: {item.motivo || '-'}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-ink-3">$</span>
            <span className="text-sm font-semibold text-success">R$ {item.valor.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-ink-3" />
            <span className="text-xs text-ink-3">{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink">Trocas & Devoluções</h1>
            <p className="text-ink-2 text-sm">{uiReturns.length} solicitações • {statusCounts.pendentes} pendentes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">{statusCounts.abertas}</div>
              <div className="text-sm text-ink-2">Abertas</div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{statusCounts.aprovadas}</div>
              <div className="text-sm text-ink-2">Aprovadas</div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{statusCounts.concluidas}</div>
              <div className="text-sm text-ink-2">Concluídas</div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">{statusCounts.recusadas}</div>
              <div className="text-sm text-ink-2">Recusadas</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="kanban" className="space-y-6">
          <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-background border border-border/80 p-1.5 text-muted-foreground w-full max-w-md shadow-lg shadow-black/5">
            <TabsTrigger value="kanban" className="relative px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg hover:bg-muted/60 hover:text-foreground group">
              <span className="relative z-10">Kanban</span>
            </TabsTrigger>
            <TabsTrigger value="lista" className="relative px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg hover:bg-muted/60 hover:text-foreground group">
              <span className="relative z-10">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="resumo" className="relative px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg hover:bg-muted/60 hover:text-foreground group">
              <span className="relative z-10">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="config" asChild>
              <Link to={`/store/${storeId}/returns/setup`} className="relative px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out hover:bg-muted/60 hover:text-foreground rounded-lg group">
                <span className="relative z-10">Configurar</span>
              </Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative flex-1 max-w-full sm:max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por código, pedido ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 bg-white border-gray-200" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-white border-gray-200">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Nova">Nova</SelectItem>
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Aprovada">Aprovada</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 bg-white border-gray-200">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="Devolução">Devolução</SelectItem>
                  <SelectItem value="Troca">Troca</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kanban Board */}
            <div className="overflow-x-auto pb-4">
              <div className="grid grid-cols-7 gap-4 min-h-[70vh] min-w-[1400px]">
                {filteredColumns.map((column) => (
                  <div key={column.id} className="min-w-[200px] bg-white rounded-xl border border-border shadow-xs">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-ink">{column.title}</h3>
                        <div className="flex items-center justify-center w-6 h-6 bg-ink-3/10 rounded-full">
                          <span className="text-xs font-medium text-ink-2">{(column as any).items.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 space-y-3 min-h-[calc(70vh-80px)] max-h-[calc(70vh-80px)] overflow-y-auto">
                      {(column as any).items.map((item: UIReturn) => (
                        <KanbanCard key={item.id} item={item} />
                      ))}
                      {(column as any).items.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-sm text-ink-3">Nenhum item</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lista" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative flex-1 max-w-full sm:max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por código, pedido ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 bg-white border-gray-200" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-white border-gray-200">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Nova">Nova</SelectItem>
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Aprovada">Aprovada</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 bg-white border-gray-200">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="Devolução">Devolução</SelectItem>
                  <SelectItem value="Troca">Troca</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="bg-white border-gray-200">
                <Filter className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>

            {/* Header with title and count */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Solicitações ({uiReturns.length})</h2>
              <Button variant="outline" className="bg-white border-gray-200">
                <Filter className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>

            {/* Lista */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr className="text-left">
                        <th className="p-4 font-medium text-ink-2 text-sm">Código</th>
                        <th className="p-4 font-medium text-ink-2 text-sm">Pedido</th>
                        <th className="p-4 font-medium text-ink-2 text-sm">Cliente</th>
                        <th className="p-4 font-medium text-ink-2 text-sm">Tipo</th>
                        <th className="p-4 font-medium text-ink-2 text-sm">Status</th>
                        <th className="p-4 font-medium text-ink-2 text-sm">Valor</th>
                        <th className="p-4 font-medium text-ink-2 text-sm">Data</th>
                        <th className="p-4 font-medium text-ink-2 text-sm">Origem</th>
                        <th className="p-4 font-medium text-ink-2 text-sm"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {uiReturns
                        .filter((item) => {
                          const matchesSearch =
                            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.cliente.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesStatus = statusFilter === 'all' || item.status === (statusFilter as any);
                          const matchesType = typeFilter === 'all' || item.tipo === typeFilter;
                          return matchesSearch && matchesStatus && matchesType;
                        })
                        .map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleReturnClick(item)}>
                            <td className="p-4">
                              <span className="font-medium text-brand-600">{item.id}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-ink">{item.pedido}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-ink">{item.cliente}</span>
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary" className={`${item.tipo === 'Devolução' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'} border-0`}>
                                {item.tipo}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span className="text-ink text-sm">{item.status}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-medium text-green-600">R$ {item.valor.toFixed(2).replace('.', ',')}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-ink-3 text-sm">
                                {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={`${item.origem === 'Link público' ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-600'} text-xs`}>
                                {item.origem === 'Link público' ? 'Portal' : item.origem}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ExternalLink className="h-4 w-4 text-ink-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {uiReturns.filter((item) => {
                  const matchesSearch =
                    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.cliente.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || item.status === (statusFilter as any);
                  const matchesType = typeFilter === 'all' || item.tipo === typeFilter;
                  return matchesSearch && matchesStatus && matchesType;
                }).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-ink-3">Nenhuma solicitação encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumo" className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-status-new"></div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total de Solicitações</p>
                      <p className="text-2xl font-bold text-foreground">{uiReturns.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-status-approved"></div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Aprovadas</p>
                      <p className="text-2xl font-bold text-foreground">{uiReturns.filter((r) => ['Aprovada', 'Concluída'].includes(r.status)).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-status-analysis"></div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Em Análise</p>
                      <p className="text-2xl font-bold text-foreground">{uiReturns.filter((r) => r.status === 'Em análise').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                      <p className="text-2xl font-bold text-foreground">R$ {uiReturns.reduce((sum, r) => sum + (r.valor || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos por Status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-foreground">Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {columns.map((column) => {
                    const percentage = uiReturns.length > 0 ? (((column as any).items.length / uiReturns.length) * 100) : 0;
                    return (
                      <div key={column.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded ${(column as any).color}`}></div>
                          <span className="font-medium text-foreground">{column.title}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-muted rounded-full h-2 w-32">
                            <div className={`h-2 rounded-full ${(column as any).color}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="text-sm font-semibold text-foreground w-12 text-right">{(column as any).items.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tipos de Solicitação */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-foreground">Tipos de Solicitação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Troca', 'Devolução'].map((tipo) => {
                    const count = uiReturns.filter((r) => r.tipo === tipo).length;
                    const percentage = uiReturns.length > 0 ? (count / uiReturns.length) * 100 : 0;
                    return (
                      <div key={tipo} className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{tipo}</span>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-muted rounded-full h-2 w-32">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="text-sm font-semibold text-foreground w-12 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Detalhes */}
        <ReturnDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} returnRequest={selectedReturn} onStatusUpdate={handleStatusUpdate} />
      </div>
    </div>
  );
};

export default Returns;
