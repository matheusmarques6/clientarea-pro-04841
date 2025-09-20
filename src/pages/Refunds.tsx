import { useState } from 'react';
import { Search, Filter, Plus, Copy, Eye, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RefundDetailsModal } from '@/components/refunds/RefundDetailsModal';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

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

// Mock data
const mockRefunds: RefundItem[] = [
  {
    id: 'RB-3021',
    storeId: 'store-1',
    orderId: '#28471',
    customer: {
      name: 'Maria Silva',
      email: 'maria@email.com',
      phone: '+5511999888777'
    },
    items: [{
      lineId: 'item-1',
      sku: 'CAM-001',
      title: 'Camiseta Premium Azul',
      qty: 1,
      price: 89.90,
      currency: 'BRL'
    }],
    reason: {
      code: 'ARREP',
      note: 'Não gostei da cor'
    },
    attachments: [],
    requestedAmount: {
      value: 89.90,
      currency: 'BRL'
    },
    method: {
      type: 'PIX',
      pixKey: 'maria@email.com',
      pixKeyType: 'email'
    },
    status: 'EM_ANALISE',
    riskScore: 25,
    timeline: [
      {
        at: '2025-09-20T10:30:00Z',
        event: 'Solicitação criada',
        by: 'user'
      }
    ],
    publicUrl: 'https://loja.com/refunds/status/RB-3021',
    createdAt: '2025-09-20T10:30:00Z'
  },
  {
    id: 'RB-3020',
    storeId: 'store-1',
    orderId: '#28469',
    customer: {
      name: 'João Santos',
      email: 'joao@email.com'
    },
    items: [{
      lineId: 'item-2',
      sku: 'CALC-001',
      title: 'Calça Jeans Slim',
      qty: 1,
      price: 129.90,
      currency: 'BRL'
    }],
    reason: {
      code: 'DEFEITO',
      note: 'Produto com defeito na costura'
    },
    attachments: ['foto1.jpg', 'foto2.jpg'],
    requestedAmount: {
      value: 129.90,
      currency: 'BRL'
    },
    finalAmount: {
      value: 129.90,
      currency: 'BRL'
    },
    method: {
      type: 'CARD'
    },
    status: 'APROVADO',
    riskScore: 15,
    timeline: [
      {
        at: '2025-09-19T14:20:00Z',
        event: 'Solicitação criada',
        by: 'user'
      },
      {
        at: '2025-09-19T15:10:00Z',
        event: 'Aprovado automaticamente',
        by: 'system'
      }
    ],
    publicUrl: 'https://loja.com/refunds/status/RB-3020',
    createdAt: '2025-09-19T14:20:00Z'
  }
];

const Refunds = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refunds, setRefunds] = useState<RefundItem[]>(mockRefunds);

  const handleCopyPublicLink = () => {
    const publicLink = 'https://loja.com/refunds';
    navigator.clipboard.writeText(publicLink);
    toast({
      title: "Link copiado",
      description: "Link público do portal de reembolsos copiado para a área de transferência",
    });
  };

  const handleStatusUpdate = (refundId: string, newStatus: RefundItem['status'], finalAmount?: number) => {
    setRefunds(refunds.map(refund => 
      refund.id === refundId 
        ? { 
            ...refund, 
            status: newStatus,
            finalAmount: finalAmount ? { value: finalAmount, currency: 'BRL' } : refund.finalAmount,
            timeline: [
              ...refund.timeline,
              {
                at: new Date().toISOString(),
                event: `Status alterado para ${newStatus}`,
                by: 'agent' as const
              }
            ]
          }
        : refund
    ));
    
    toast({
      title: "Status atualizado",
      description: `Reembolso ${refundId} atualizado para ${newStatus}`,
    });
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

  const getMethodLabel = (type: string) => {
    const methods = {
      'CARD': 'Cartão',
      'PIX': 'PIX',
      'BOLETO': 'Boleto',
      'VOUCHER': 'Vale-compra'
    };
    return methods[type as keyof typeof methods] || type;
  };

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDaysAgo = (dateString: string) => {
    const diff = new Date().getTime() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 3600 * 24));
    return days === 0 ? 'Hoje' : days === 1 ? '1 dia' : `${days} dias`;
  };

  // Kanban columns
  const columns = [
    { id: 'SOLICITADO', title: 'Solicitado', color: 'bg-gray-50 border-gray-200' },
    { id: 'EM_ANALISE', title: 'Em análise', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'APROVADO', title: 'Aprovado', color: 'bg-green-50 border-green-200' },
    { id: 'PROCESSANDO', title: 'Processando pagamento', color: 'bg-blue-50 border-blue-200' },
    { id: 'CONCLUIDO', title: 'Concluído', color: 'bg-emerald-50 border-emerald-200' },
    { id: 'RECUSADO', title: 'Recusado', color: 'bg-red-50 border-red-200' }
  ];

  const KanbanCard = ({ refund }: { refund: RefundItem }) => (
    <div 
      className="p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group animate-hover glass-card"
      onClick={() => {
        setSelectedRefund(refund);
        setIsModalOpen(true);
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
            {refund.id}
          </div>
          <div className="text-xs text-muted-foreground">
            Pedido {refund.orderId}
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
          {getDaysAgo(refund.createdAt)}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground truncate">
          {refund.customer.name}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-green-600">
            {formatCurrency(refund.requestedAmount.value)}
          </div>
          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted/30">
            {getMethodLabel(refund.method.type)}
          </Badge>
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
          {getReasonLabel(refund.reason.code)}
        </div>
        
        <div className="flex justify-between items-center pt-1">
          <div className="flex items-center gap-1">
            {refund.attachments.length > 0 && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                📎 {refund.attachments.length}
              </span>
            )}
          </div>
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
            refund.riskScore > 70 ? 'bg-red-100 text-red-800' :
            refund.riskScore > 40 ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            Score: {refund.riskScore}
          </div>
        </div>
      </div>
    </div>
  );

  // Summary data for charts
  const statusData = columns.map(col => ({
    name: col.title,
    value: refunds.filter(r => r.status === col.id).length
  }));

  const methodData = [
    { name: 'PIX', value: refunds.filter(r => r.method.type === 'PIX').length },
    { name: 'Cartão', value: refunds.filter(r => r.method.type === 'CARD').length },
    { name: 'Vale-compra', value: refunds.filter(r => r.method.type === 'VOUCHER').length },
    { name: 'Boleto', value: refunds.filter(r => r.method.type === 'BOLETO').length }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const filteredRefunds = refunds.filter(refund =>
    refund.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    refund.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    refund.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRequested = refunds.reduce((sum, r) => sum + r.requestedAmount.value, 0);
  const totalApproved = refunds.filter(r => ['APROVADO', 'PROCESSANDO', 'CONCLUIDO'].includes(r.status))
    .reduce((sum, r) => sum + (r.finalAmount?.value || r.requestedAmount.value), 0);
  const approvalRate = refunds.length > 0 ? 
    (refunds.filter(r => ['APROVADO', 'PROCESSANDO', 'CONCLUIDO'].includes(r.status)).length / refunds.length) * 100 : 0;
  const avgTicket = refunds.length > 0 ? totalRequested / refunds.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center md:text-left space-y-3 mb-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Reembolsos
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Loja Premium Fashion</p>
          </div>
          <div className="flex items-center justify-center md:justify-start">
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full"></div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-end gap-2 w-full md:w-auto mb-6">
          <Button variant="outline" onClick={handleCopyPublicLink} className="w-full sm:w-auto">
            <Copy className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Copiar link público</span>
            <span className="sm:hidden">Copiar link</span>
          </Button>
          <Link to="/store/1/refunds/setup">
            <Button variant="outline" className="w-full sm:w-auto">
              <Eye className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">Config</span>
            </Button>
          </Link>
          <Link to="/store/1/refunds/new">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova solicitação</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="kanban" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-10 max-w-md">
            <TabsTrigger value="kanban" className="text-xs sm:text-sm">Kanban</TabsTrigger>
            <TabsTrigger value="list" className="text-xs sm:text-sm">Lista</TabsTrigger>
            <TabsTrigger value="summary" className="text-xs sm:text-sm">Resumo</TabsTrigger>
          </TabsList>

          {/* Kanban View */}
          <TabsContent value="kanban" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar reembolsos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="SOLICITADO">Solicitado</SelectItem>
                  <SelectItem value="EM_ANALISE">Em análise</SelectItem>
                  <SelectItem value="APROVADO">Aprovado</SelectItem>
                  <SelectItem value="PROCESSANDO">Processando</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="RECUSADO">Recusado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kanban Board - Responsive Grid */}
            <div className="w-full">
              {/* Mobile: Stacked Cards */}
              <div className="block sm:hidden space-y-4">
                {columns.map(column => {
                  const columnRefunds = filteredRefunds.filter(refund => refund.status === column.id);
                  if (columnRefunds.length === 0) return null;
                  
                  return (
                    <Card key={column.id} className="glass-card">
                      <CardHeader className="pb-3">
                        <CardTitle className={`text-sm rounded-lg px-3 py-2 text-center ${column.color}`}>
                          {column.title} ({columnRefunds.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {columnRefunds.map(refund => (
                          <KanbanCard key={refund.id} refund={refund} />
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Tablet: 2 Columns */}
              <div className="hidden sm:block lg:hidden">
                <div className="grid grid-cols-2 gap-4">
                  {columns.map(column => {
                    const columnRefunds = filteredRefunds.filter(refund => refund.status === column.id);
                    return (
                      <Card key={column.id} className={`glass-card ${column.color.includes('bg-') ? '' : 'border-l-4'} ${column.color}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold text-center">
                            {column.title}
                            <span className="ml-2 text-xs opacity-75">({columnRefunds.length})</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 min-h-[200px]">
                          {columnRefunds.map(refund => (
                            <KanbanCard key={refund.id} refund={refund} />
                          ))}
                          {columnRefunds.length === 0 && (
                            <div className="text-center py-8">
                              <p className="text-xs text-muted-foreground">Nenhum item</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: Full Kanban */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto pb-4">
                  <div className="grid grid-cols-6 gap-4 min-h-[600px] min-w-[1200px]">
                    {columns.map(column => {
                      const columnRefunds = filteredRefunds.filter(refund => refund.status === column.id);
                      return (
                        <div key={column.id} className="min-w-[200px]">
                          <div className={`rounded-lg border-2 ${column.color} min-h-[600px] glass-card`}>
                            <div className="p-4 border-b bg-white/20 backdrop-blur-sm rounded-t-lg">
                              <h3 className="font-semibold text-sm text-center">{column.title}</h3>
                              <p className="text-xs text-center opacity-75 mt-1">{columnRefunds.length} reembolsos</p>
                            </div>
                            <div className="p-3 space-y-3">
                              {columnRefunds.map(refund => (
                                <KanbanCard key={refund.id} refund={refund} />
                              ))}
                              {columnRefunds.length === 0 && (
                                <div className="text-center py-12">
                                  <p className="text-xs text-muted-foreground">Nenhum item</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar reembolsos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card className="glass-card">
              <CardContent className="p-0">
                {/* Mobile Card View */}
                <div className="block md:hidden">
                  {filteredRefunds.map(refund => (
                    <div
                      key={refund.id}
                      className="p-4 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedRefund(refund);
                        setIsModalOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-foreground">{refund.id}</div>
                        <Badge className={getStatusColor(refund.status)}>
                          {refund.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div><span className="text-muted-foreground">Cliente:</span> {refund.customer.name}</div>
                        <div><span className="text-muted-foreground">Pedido:</span> {refund.orderId}</div>
                        <div><span className="text-muted-foreground">Valor:</span> {formatCurrency(refund.requestedAmount.value)}</div>
                        <div><span className="text-muted-foreground">Método:</span> {getMethodLabel(refund.method.type)}</div>
                        <div><span className="text-muted-foreground">Motivo:</span> {getReasonLabel(refund.reason.code)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Protocolo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[80px]">Score</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRefunds.map(refund => (
                        <TableRow 
                          key={refund.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedRefund(refund);
                            setIsModalOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">{refund.id}</TableCell>
                          <TableCell>{refund.customer.name}</TableCell>
                          <TableCell>{refund.orderId}</TableCell>
                          <TableCell>{formatCurrency(refund.requestedAmount.value)}</TableCell>
                          <TableCell>{getMethodLabel(refund.method.type)}</TableCell>
                          <TableCell>{getReasonLabel(refund.reason.code)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(refund.status)}>
                              {refund.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-block px-2 py-1 rounded text-xs ${
                              refund.riskScore > 70 ? 'bg-red-100 text-red-800' :
                              refund.riskScore > 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {refund.riskScore}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(refund.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredRefunds.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhum reembolso encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary View */}
          <TabsContent value="summary" className="space-y-4 sm:space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Solicitado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalRequested)}</div>
                  <p className="text-xs text-muted-foreground">+12% vs mês anterior</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Aprovado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalApproved)}</div>
                  <p className="text-xs text-muted-foreground">+5% vs mês anterior</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{approvalRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">-2% vs mês anterior</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(avgTicket)}</div>
                  <p className="text-xs text-muted-foreground">+8% vs mês anterior</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius="80%"
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Métodos de Reembolso</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={methodData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius="80%"
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {methodData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Refund Details Modal */}
        <RefundDetailsModal
          refund={selectedRefund}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onStatusUpdate={handleStatusUpdate}
        />
      </div>
    </div>
  );
};

export default Refunds;