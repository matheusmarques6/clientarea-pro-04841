import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Copy, Filter, Search, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { mockReturns, mockStores } from '@/lib/mockData';
import { ReturnRequest } from '@/types';
import ReturnDetailsModal from '@/components/returns/ReturnDetailsModal';

const Returns = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [returns, setReturns] = useState(mockReturns);
  
  const store = mockStores.find(s => s.id === storeId);
  
  if (!store) {
    return <div>Loja não encontrada</div>;
  }

  const handleCopyPublicLink = () => {
    const publicLink = `${window.location.origin}/public/returns/${store.name.toLowerCase().replace(/\s+/g, '-')}`;
    navigator.clipboard.writeText(publicLink);
    toast({
      title: "Link copiado!",
      description: "Link público copiado para a área de transferência",
    });
  };

  const handleReturnClick = (returnRequest: ReturnRequest) => {
    setSelectedReturn(returnRequest);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = (id: string, newStatus: ReturnRequest['status']) => {
    setReturns(prev => 
      prev.map(ret => 
        ret.id === id ? { ...ret, status: newStatus, updatedAt: new Date().toISOString() } : ret
      )
    );
    setSelectedReturn(prev => 
      prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null
    );
    toast({
      title: "Status atualizado!",
      description: `Status alterado para: ${newStatus}`,
    });
  };

  const getStatusColor = (status: ReturnRequest['status']) => {
    const colors = {
      'Nova': 'bg-slate-100 text-slate-800',
      'Em análise': 'bg-yellow-100 text-yellow-800',
      'Aprovada': 'bg-green-100 text-green-800',
      'Aguardando postagem': 'bg-blue-100 text-blue-800',
      'Recebida em CD': 'bg-purple-100 text-purple-800',
      'Concluída': 'bg-emerald-100 text-emerald-800',
      'Recusada': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      id: 'nova',
      title: 'Nova',
      status: 'Nova',
      color: 'bg-slate-200 text-slate-900 border-slate-300',
      items: returns.filter(r => r.status === 'Nova')
    },
    {
      id: 'analise',
      title: 'Em análise',
      status: 'Em análise',
      color: 'bg-yellow-200 text-yellow-900 border-yellow-300',
      items: returns.filter(r => r.status === 'Em análise')
    },
    {
      id: 'aprovada',
      title: 'Aprovada',
      status: 'Aprovada',
      color: 'bg-green-200 text-green-900 border-green-300',
      items: returns.filter(r => r.status === 'Aprovada')
    },
    {
      id: 'postagem',
      title: 'Aguardando postagem',
      status: 'Aguardando postagem',
      color: 'bg-blue-200 text-blue-900 border-blue-300',
      items: returns.filter(r => r.status === 'Aguardando postagem')
    },
    {
      id: 'recebida',
      title: 'Recebida em CD',
      status: 'Recebida em CD',
      color: 'bg-purple-200 text-purple-900 border-purple-300',
      items: returns.filter(r => r.status === 'Recebida em CD')
    },
    {
      id: 'concluida',
      title: 'Concluída',
      status: 'Concluída',
      color: 'bg-emerald-200 text-emerald-900 border-emerald-300',
      items: returns.filter(r => r.status === 'Concluída')
    },
    {
      id: 'recusada',
      title: 'Recusada',
      status: 'Recusada',
      color: 'bg-red-200 text-red-900 border-red-300',
      items: returns.filter(r => r.status === 'Recusada')
    }
  ];

  const filteredColumns = columns.map(column => ({
    ...column,
    items: column.items.filter(item => 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }));

  const KanbanCard = ({ item }: { item: ReturnRequest }) => (
    <Card 
      className="bg-card border-border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] mb-3" 
      onClick={() => handleReturnClick(item)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm text-foreground">{item.id}</p>
            <p className="text-xs text-muted-foreground">{item.pedido}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{item.cliente}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-foreground border-border">
              {item.tipo}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.motivo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              R$ {item.valor.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Trocas & Devoluções</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleCopyPublicLink} className="w-full sm:w-auto">
            <Copy className="h-4 w-4 mr-2" />
            Copiar Link Público
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link to={`/store/${storeId}/returns/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="space-y-6">
        <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-muted/30 backdrop-blur-sm border border-border/50 p-1 text-muted-foreground w-full max-w-md shadow-sm">{/* Design mais profissional */}
          <TabsTrigger value="kanban" className="px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-0 rounded-md hover:bg-background/50 hover:text-foreground">
            Kanban
          </TabsTrigger>
          <TabsTrigger value="lista" className="px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-0 rounded-md hover:bg-background/50 hover:text-foreground">
            Lista
          </TabsTrigger>
          <TabsTrigger value="resumo" className="px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-0 rounded-md hover:bg-background/50 hover:text-foreground">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="config" asChild>
            <Link 
              to={`/store/${storeId}/returns/setup`} 
              className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-background/50 hover:text-foreground rounded-md"
            >
              Configurar
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background border-border"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto bg-background border-border">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-7 gap-4 min-h-[70vh] min-w-[1400px]">
              {filteredColumns.map((column) => (
                <div key={column.id} className="min-w-[200px] bg-muted/20 rounded-lg border border-border">
                  {/* Header da coluna com cores mais nítidas */}
                  <div className={`p-4 rounded-t-lg border-b border-border ${column.color} font-semibold`}>
                    <h3 className="text-sm text-center">{column.title}</h3>
                    <p className="text-xs text-center opacity-80 mt-1">{column.items.length} itens</p>
                  </div>
                  {/* Cards container */}
                  <div className="p-3 space-y-3 min-h-[calc(70vh-80px)] max-h-[calc(70vh-80px)] overflow-y-auto">
                    {column.items.map((item) => (
                      <KanbanCard key={item.id} item={item} />
                    ))}
                    {column.items.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-sm text-muted-foreground">Nenhum item</p>
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
              <Input
                placeholder="Buscar por pedido, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background border-border"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto bg-background border-border">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Lista */}
          <Card className="bg-card border-border shadow-sm">{/* Card com fundo sólido */}
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-left">
                      <th className="p-4 font-semibold text-foreground">ID</th>
                      <th className="p-4 font-semibold text-foreground">Pedido</th>
                      <th className="p-4 font-semibold text-foreground">Cliente</th>
                      <th className="p-4 font-semibold text-foreground">Tipo</th>
                      <th className="p-4 font-semibold text-foreground">Status</th>
                      <th className="p-4 font-semibold text-foreground">Valor</th>
                      <th className="p-4 font-semibold text-foreground">Data</th>
                      <th className="p-4 font-semibold text-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns
                      .filter(item => 
                        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.cliente.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item) => (
                        <tr 
                          key={item.id} 
                          className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => handleReturnClick(item)}
                        >
                          <td className="p-4">
                            <span className="font-medium text-foreground">{item.id}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-foreground">{item.pedido}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-foreground">{item.cliente}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-foreground border-border">
                              {item.tipo}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-foreground">
                              R$ {item.valor.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {returns.filter(item => 
                item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.cliente.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
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
                    <p className="text-2xl font-bold text-foreground">{returns.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border shadow-sm">{/* Cards com fundo sólido */}
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-status-approved"></div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aprovadas</p>
                    <p className="text-2xl font-bold text-foreground">
                      {returns.filter(r => ['Aprovada', 'Concluída'].includes(r.status)).length}
                    </p>
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
                    <p className="text-2xl font-bold text-foreground">
                      {returns.filter(r => r.status === 'Em análise').length}
                    </p>
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
                    <p className="text-2xl font-bold text-foreground">
                      R$ {returns.reduce((sum, r) => sum + r.valor, 0).toFixed(2)}
                    </p>
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
                  const percentage = returns.length > 0 ? (column.items.length / returns.length) * 100 : 0;
                  return (
                    <div key={column.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${column.color}`}></div>
                        <span className="font-medium text-foreground">{column.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-muted rounded-full h-2 w-32">
                          <div 
                            className={`h-2 rounded-full ${column.color}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-foreground w-12 text-right">
                          {column.items.length}
                        </span>
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
                  const count = returns.filter(r => r.tipo === tipo).length;
                  const percentage = returns.length > 0 ? (count / returns.length) * 100 : 0;
                  return (
                    <div key={tipo} className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{tipo}</span>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-muted rounded-full h-2 w-32">
                          <div 
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-foreground w-12 text-right">
                          {count}
                        </span>
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
      <ReturnDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        returnRequest={selectedReturn}
        onStatusUpdate={handleStatusUpdate}
      />
      </div>
    </div>
  );
};

export default Returns;