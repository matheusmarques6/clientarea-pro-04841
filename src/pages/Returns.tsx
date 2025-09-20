import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Copy, Filter, Search, MoreHorizontal } from 'lucide-react';
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
      'Nova': 'status-new',
      'Em análise': 'status-analysis',
      'Aprovada': 'status-approved',
      'Aguardando postagem': 'status-waiting',
      'Recebida em CD': 'status-received',
      'Concluída': 'status-completed',
      'Recusada': 'status-refused'
    };
    return colors[status] || 'bg-gray-100';
  };

  const columns = [
    {
      id: 'nova',
      title: 'Nova',
      status: 'Nova',
      color: 'bg-status-new',
      items: returns.filter(r => r.status === 'Nova')
    },
    {
      id: 'analise',
      title: 'Em análise',
      status: 'Em análise',
      color: 'bg-status-analysis',
      items: returns.filter(r => r.status === 'Em análise')
    },
    {
      id: 'aprovada',
      title: 'Aprovada',
      status: 'Aprovada',
      color: 'bg-status-approved',
      items: returns.filter(r => r.status === 'Aprovada')
    },
    {
      id: 'postagem',
      title: 'Aguardando postagem',
      status: 'Aguardando postagem',
      color: 'bg-status-waiting',
      items: returns.filter(r => r.status === 'Aguardando postagem')
    },
    {
      id: 'recebida',
      title: 'Recebida em CD',
      status: 'Recebida em CD',
      color: 'bg-status-received',
      items: returns.filter(r => r.status === 'Recebida em CD')
    },
    {
      id: 'concluida',
      title: 'Concluída',
      status: 'Concluída',
      color: 'bg-status-completed',
      items: returns.filter(r => r.status === 'Concluída')
    },
    {
      id: 'recusada',
      title: 'Recusada',
      status: 'Recusada',
      color: 'bg-status-refused',
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
      className="glass-card mb-3 animate-hover cursor-pointer transition-all duration-200 hover:shadow-hover" 
      onClick={() => handleReturnClick(item)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm">{item.id}</p>
            <p className="text-xs text-muted-foreground">{item.pedido}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium">{item.cliente}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {item.tipo}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.motivo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Trocas & Devoluções</h1>
          <p className="text-muted-foreground">{store.name}</p>
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

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:flex">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="lista" className="text-xs sm:text-sm">Lista</TabsTrigger>
          <TabsTrigger value="resumo" className="text-xs sm:text-sm">Resumo</TabsTrigger>
          <TabsTrigger value="config" asChild className="col-span-2 sm:col-span-1">
            <Link to={`/store/${storeId}/returns/setup`} className="text-xs sm:text-sm">
              Configurar Link Público
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-7 gap-2 sm:gap-4 min-h-[400px] sm:min-h-[600px] min-w-[1400px]">
              {filteredColumns.map((column) => (
                <div key={column.id} className="space-y-2 sm:space-y-3 min-w-[180px] sm:min-w-[200px]">
                  <div className={`p-2 sm:p-3 rounded-lg text-white text-center ${column.color}`}>
                    <h3 className="font-semibold text-xs sm:text-sm">{column.title}</h3>
                    <p className="text-xs opacity-80">{column.items.length} itens</p>
                  </div>
                  <div className="space-y-2">
                    {column.items.map((item) => (
                      <KanbanCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lista">
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground py-8">
                Lista em desenvolvimento...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumo">
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground py-8">
                Resumo em desenvolvimento...
              </p>
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
  );
};

export default Returns;