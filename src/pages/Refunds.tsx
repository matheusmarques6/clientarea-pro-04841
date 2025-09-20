import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Download, ExternalLink, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, CreditCard, Smartphone, Receipt, Gift, TrendingUp, Users, DollarSign } from "lucide-react";
import { RefundDetailsModal } from "@/components/refunds/RefundDetailsModal";

// Types
interface RefundItem {
  id: string;
  protocol: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  requestedAmount: number;
  finalAmount?: number;
  method: 'CARD' | 'PIX' | 'BOLETO' | 'VOUCHER';
  reason: string;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  riskScore: number;
  createdAt: string;
  updatedAt: string;
  attachments: string[];
  timeline: Array<{
    id: string;
    timestamp: string;
    action: string;
    description: string;
    user: string;
  }>;
}

// Mock data
const mockRefunds: RefundItem[] = [
  {
    id: '1',
    protocol: 'RB-2024-001',
    orderId: '#12345',
    customer: {
      name: 'Ana Silva',
      email: 'ana.silva@email.com',
      phone: '+55 11 99999-9999'
    },
    items: [
      {
        id: '1',
        name: 'Camiseta Premium',
        sku: 'CAM-001',
        quantity: 1,
        price: 89.90,
        image: '/placeholder.svg'
      }
    ],
    requestedAmount: 89.90,
    finalAmount: 89.90,
    method: 'CARD',
    reason: 'Produto defeituoso',
    status: 'REQUESTED',
    riskScore: 25,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    attachments: ['photo1.jpg'],
    timeline: [
      {
        id: '1',
        timestamp: '2024-01-15T10:00:00Z',
        action: 'created',
        description: 'Solicitação de reembolso criada',
        user: 'Ana Silva'
      }
    ]
  },
  {
    id: '2',
    protocol: 'RB-2024-002',
    orderId: '#12346',
    customer: {
      name: 'Carlos Mendes',
      email: 'carlos.mendes@email.com'
    },
    items: [
      {
        id: '2',
        name: 'Tênis Esportivo',
        sku: 'TEN-002',
        quantity: 1,
        price: 299.90
      }
    ],
    requestedAmount: 299.90,
    method: 'PIX',
    reason: 'Mudança de ideia',
    status: 'APPROVED',
    riskScore: 45,
    createdAt: '2024-01-14T15:30:00Z',
    updatedAt: '2024-01-14T16:00:00Z',
    attachments: [],
    timeline: [
      {
        id: '1',
        timestamp: '2024-01-14T15:30:00Z',
        action: 'created',
        description: 'Solicitação de reembolso criada',
        user: 'Carlos Mendes'
      },
      {
        id: '2',
        timestamp: '2024-01-14T16:00:00Z',
        action: 'approved',
        description: 'Reembolso aprovado',
        user: 'Admin'
      }
    ]
  }
];

const statusConfig = {
  REQUESTED: { label: 'Solicitado', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  UNDER_REVIEW: { label: 'Em análise', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Eye },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  PROCESSING: { label: 'Processando', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Clock },
  COMPLETED: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  REJECTED: { label: 'Recusado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
};

const methodConfig = {
  CARD: { label: 'Cartão', icon: CreditCard },
  PIX: { label: 'PIX', icon: Smartphone },
  BOLETO: { label: 'Boleto', icon: Receipt },
  VOUCHER: { label: 'Voucher', icon: Gift }
};

export default function Refunds() {
  const { toast } = useToast();
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refunds, setRefunds] = useState<RefundItem[]>(mockRefunds);

  const handleCopyPublicLink = () => {
    const publicLink = `${window.location.origin}/refunds/loja-exemplo`;
    navigator.clipboard.writeText(publicLink);
    toast({
      title: "Link copiado!",
      description: "O link público foi copiado para a área de transferência.",
    });
  };

  const handleStatusUpdate = (refundId: string, newStatus: RefundItem['status']) => {
    setRefunds(prev => prev.map(refund => 
      refund.id === refundId 
        ? { 
            ...refund, 
            status: newStatus,
            updatedAt: new Date().toISOString(),
            timeline: [
              ...refund.timeline,
              {
                id: Math.random().toString(),
                timestamp: new Date().toISOString(),
                action: newStatus.toLowerCase(),
                description: `Status alterado para ${statusConfig[newStatus].label}`,
                user: 'Admin'
              }
            ]
          }
        : refund
    ));
    setSelectedRefund(null);
    setIsModalOpen(false);
    toast({
      title: "Status atualizado",
      description: `Reembolso ${newStatus === 'COMPLETED' ? 'concluído' : 'atualizado'} com sucesso.`
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600 bg-green-50';
    if (score <= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch = refund.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         refund.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         refund.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: refunds.length,
    requested: refunds.filter(r => r.status === 'REQUESTED').length,
    approved: refunds.filter(r => r.status === 'APPROVED').length,
    completed: refunds.filter(r => r.status === 'COMPLETED').length,
    totalAmount: refunds.reduce((sum, r) => sum + r.requestedAmount, 0),
    avgAmount: refunds.length > 0 ? refunds.reduce((sum, r) => sum + r.requestedAmount, 0) / refunds.length : 0
  };

  const RefundCard = ({ refund }: { refund: RefundItem }) => {
    const StatusIcon = statusConfig[refund.status].icon;
    const MethodIcon = methodConfig[refund.method].icon;

    return (
      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-primary/20" 
            onClick={() => { setSelectedRefund(refund); setIsModalOpen(true); }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{refund.protocol}</h3>
                <Badge variant="outline" className={`${statusConfig[refund.status].color} border`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig[refund.status].label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Pedido {refund.orderId}</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-primary">{formatCurrency(refund.requestedAmount)}</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MethodIcon className="w-3 h-3" />
                {methodConfig[refund.method].label}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{refund.customer.name}</p>
                <p className="text-sm text-muted-foreground">{refund.customer.email}</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(refund.riskScore)}`}>
                  Risco: {refund.riskScore}%
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground mb-2">Motivo: {refund.reason}</p>
              <p className="text-xs text-muted-foreground">
                Criado em {formatDate(refund.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reembolsos</h1>
          <p className="text-muted-foreground">Gerencie solicitações de reembolso da sua loja</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyPublicLink}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Copiar link público
          </Button>
          <Link to="/store/1/refunds/setup">
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Configurar
            </Button>
          </Link>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Reembolsos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-yellow-600">{stats.requested}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Médio</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatCurrency(stats.avgAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por cliente, protocolo ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="REQUESTED">Solicitado</SelectItem>
                <SelectItem value="UNDER_REVIEW">Em análise</SelectItem>
                <SelectItem value="APPROVED">Aprovado</SelectItem>
                <SelectItem value="PROCESSING">Processando</SelectItem>
                <SelectItem value="COMPLETED">Concluído</SelectItem>
                <SelectItem value="REJECTED">Recusado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Refunds List */}
      <div className="grid gap-4">
        {filteredRefunds.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum reembolso encontrado</h3>
                <p>Não há reembolsos que correspondam aos filtros selecionados.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRefunds.map((refund) => (
            <RefundCard key={refund.id} refund={refund} />
          ))
        )}
      </div>

      {/* Refund Details Modal */}
      <RefundDetailsModal
        refund={selectedRefund}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}