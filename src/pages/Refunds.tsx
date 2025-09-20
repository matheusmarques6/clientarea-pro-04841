import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Copy, Filter, Search, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { mockRefunds, mockStores } from '@/lib/mockData';
import { RefundRequest } from '@/types';

const Refunds = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  const store = mockStores.find(s => s.id === storeId);
  
  if (!store) {
    return <div>Loja não encontrada</div>;
  }

  const handleCopyPublicLink = () => {
    const publicLink = `https://${store.name.toLowerCase().replace(/\s+/g, '-')}.convertfy.com/refunds`;
    navigator.clipboard.writeText(publicLink);
    toast({
      title: "Link copiado!",
      description: "Link público copiado para a área de transferência",
    });
  };

  const columns = [
    {
      id: 'solicitado',
      title: 'Solicitado',
      status: 'Solicitado',
      color: 'status-new',
      items: mockRefunds.filter(r => r.status === 'Solicitado')
    },
    {
      id: 'analise',
      title: 'Em análise',
      status: 'Em análise',
      color: 'status-analysis',
      items: mockRefunds.filter(r => r.status === 'Em análise')
    },
    {
      id: 'aprovado',
      title: 'Aprovado',
      status: 'Aprovado',
      color: 'status-approved',
      items: mockRefunds.filter(r => r.status === 'Aprovado')
    },
    {
      id: 'processando',
      title: 'Processando pagamento',
      status: 'Processando pagamento',
      color: 'status-processing',
      items: mockRefunds.filter(r => r.status === 'Processando pagamento')
    },
    {
      id: 'concluido',
      title: 'Concluído',
      status: 'Concluído',
      color: 'status-completed',
      items: mockRefunds.filter(r => r.status === 'Concluído')
    },
    {
      id: 'recusado',
      title: 'Recusado',
      status: 'Recusado',
      color: 'status-refused',
      items: mockRefunds.filter(r => r.status === 'Recusado')
    }
  ];

  const KanbanCard = ({ item }: { item: RefundRequest }) => (
    <Card className="glass-card mb-3 animate-hover cursor-pointer">
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
              {item.metodo}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.motivo}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">
                R$ {item.valorSolicitado.toFixed(2)}
              </span>
              {item.valorSolicitado !== item.valor && (
                <span className="text-xs text-muted-foreground ml-1">
                  / R$ {item.valor.toFixed(2)}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header com botão voltar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Botão Voltar para Lojas */}
          <Button 
            asChild 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2 hover:bg-muted/50"
          >
            <Link to="/stores">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          </Button>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Reembolsos</h1>
            <p className="text-muted-foreground">{store.name}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleCopyPublicLink} className="w-full sm:w-auto">
            <Copy className="h-4 w-4 mr-2" />
            Copiar Link Público
          </Button>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Reembolso
          </Button>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="config" asChild>
            <Link to={`/store/${storeId}/refunds/setup`}>
              Configurar Link Público
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-6 gap-4 min-h-[600px]">
            {columns.map((column) => (
              <div key={column.id} className="space-y-3">
                <div className={`p-3 rounded-lg ${column.color}`}>
                  <h3 className="font-semibold text-sm">{column.title}</h3>
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
    </div>
  );
};

export default Refunds;