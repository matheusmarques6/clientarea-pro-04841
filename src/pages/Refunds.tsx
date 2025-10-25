import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Smartphone,
  Receipt,
  Gift,
  TrendingUp,
  Users,
  DollarSign,
  Settings,
} from "lucide-react";
import { RefundDetailsModal } from "@/components/refunds/RefundDetailsModal";
import { cn } from "@/lib/utils";

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
  method: "CARD" | "PIX" | "BOLETO" | "VOUCHER";
  reason: string;
  status: "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";
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

const mockRefunds: RefundItem[] = [
  {
    id: "1",
    protocol: "RB-2024-001",
    orderId: "#12345",
    customer: {
      name: "Ana Silva",
      email: "ana.silva@email.com",
      phone: "+55 11 99999-9999",
    },
    items: [
      {
        id: "1",
        name: "Camiseta Premium",
        sku: "CAM-001",
        quantity: 1,
        price: 89.9,
        image: "/placeholder.svg",
      },
    ],
    requestedAmount: 89.9,
    finalAmount: 89.9,
    method: "CARD",
    reason: "Produto defeituoso",
    status: "REQUESTED",
    riskScore: 25,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    attachments: ["photo1.jpg"],
    timeline: [
      {
        id: "1",
        timestamp: "2024-01-15T10:00:00Z",
        action: "created",
        description: "Solicitação de reembolso criada",
        user: "Ana Silva",
      },
    ],
  },
  {
    id: "2",
    protocol: "RB-2024-002",
    orderId: "#12346",
    customer: {
      name: "Carlos Mendes",
      email: "carlos.mendes@email.com",
    },
    items: [
      {
        id: "2",
        name: "Tênis Esportivo",
        sku: "TEN-002",
        quantity: 1,
        price: 299.9,
      },
    ],
    requestedAmount: 299.9,
    method: "PIX",
    reason: "Mudança de ideia",
    status: "APPROVED",
    riskScore: 45,
    createdAt: "2024-01-14T15:30:00Z",
    updatedAt: "2024-01-14T16:00:00Z",
    attachments: [],
    timeline: [
      {
        id: "1",
        timestamp: "2024-01-14T15:30:00Z",
        action: "created",
        description: "Solicitação de reembolso criada",
        user: "Carlos Mendes",
      },
      {
        id: "2",
        timestamp: "2024-01-14T16:00:00Z",
        action: "approved",
        description: "Reembolso aprovado",
        user: "Admin",
      },
    ],
  },
];

const statusConfig = {
  REQUESTED: {
    label: "Solicitado",
    indicator: "bg-brand-purple",
    chip: "bg-brand-purple-light text-brand-purple",
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: "Em análise",
    indicator: "bg-brand-orange",
    chip: "bg-brand-orange-light text-brand-orange",
    icon: Eye,
  },
  APPROVED: {
    label: "Aprovado",
    indicator: "bg-brand-green",
    chip: "bg-brand-green-light text-brand-green",
    icon: CheckCircle,
  },
  PROCESSING: {
    label: "Processando",
    indicator: "bg-brand-blue",
    chip: "bg-brand-blue-light text-brand-blue",
    icon: Clock,
  },
  COMPLETED: {
    label: "Concluído",
    indicator: "bg-primary",
    chip: "bg-brand-green-light text-brand-green",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Recusado",
    indicator: "bg-destructive",
    chip: "bg-destructive/20 text-destructive",
    icon: XCircle,
  },
} as const;

const methodConfig = {
  CARD: { label: "Cartão", icon: CreditCard, chip: "bg-brand-purple-light text-brand-purple" },
  PIX: { label: "PIX", icon: Smartphone, chip: "bg-brand-green-light text-brand-green" },
  BOLETO: { label: "Boleto", icon: Receipt, chip: "bg-brand-blue-light text-brand-blue" },
  VOUCHER: { label: "Voucher", icon: Gift, chip: "bg-brand-orange-light text-brand-orange" },
} as const;

const statusOrder: RefundItem["status"][] = [
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export default function Refunds() {
  const { toast } = useToast();
  const { id: storeId } = useParams();
  const [refunds, setRefunds] = useState<RefundItem[]>(mockRefunds);
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<RefundItem["status"] | "all">("all");

  const filteredRefunds = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return refunds.filter((refund) => {
      const matchesStatus = statusFilter === "all" || refund.status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        [refund.protocol, refund.orderId, refund.customer.name, refund.customer.email ?? ""].some((field) =>
          field.toLowerCase().includes(query),
        );

      return matchesStatus && matchesSearch;
    });
  }, [refunds, searchTerm, statusFilter]);

  const totalRefunds = refunds.length;
  const pendingCount = useMemo(
    () => refunds.filter((refund) => ["REQUESTED", "UNDER_REVIEW", "PROCESSING"].includes(refund.status)).length,
    [refunds],
  );
  const completedCount = useMemo(
    () => refunds.filter((refund) => refund.status === "COMPLETED").length,
    [refunds],
  );
  const averageValue = useMemo(() => {
    if (refunds.length === 0) return 0;
    const total = refunds.reduce((sum, refund) => sum + refund.requestedAmount, 0);
    return total / refunds.length;
  }, [refunds]);

  const kanbanColumns = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        label: statusConfig[status].label,
        indicator: statusConfig[status].indicator,
        chip: statusConfig[status].chip,
        icon: statusConfig[status].icon,
        items: filteredRefunds.filter((refund) => refund.status === status),
      })),
    [filteredRefunds],
  );

  const statusDistribution = useMemo(
    () =>
      statusOrder.map((status) => {
        const count = refunds.filter((refund) => refund.status === status).length;
        return {
          status,
          label: statusConfig[status].label,
          count,
          percentage: refunds.length ? (count / refunds.length) * 100 : 0,
        };
      }),
    [refunds],
  );

  const methodDistribution = useMemo(() => {
    const counts = refunds.reduce<Record<string, number>>((acc, refund) => {
      acc[refund.method] = (acc[refund.method] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(methodConfig).map(([key, value]) => {
      const count = counts[key] || 0;
      return {
        method: key as RefundItem["method"],
        label: value.label,
        chip: value.chip,
        count,
        percentage: refunds.length ? (count / refunds.length) * 100 : 0,
      };
    });
  }, [refunds]);

  const reasonSummary = useMemo(() => {
    const counts = refunds.reduce<Record<string, number>>((acc, refund) => {
      acc[refund.reason] = (acc[refund.reason] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [refunds]);

  const handleCopyPublicLink = () => {
    const publicLink = `${window.location.origin}/refunds/${storeId ?? "loja"}`;
    navigator.clipboard.writeText(publicLink);
    toast({
      title: "Link copiado!",
      description: "O link público foi copiado para a área de transferência.",
    });
  };

  const handleStatusUpdate = (refundId: string, newStatus: RefundItem["status"]) => {
    setRefunds((prev) =>
      prev.map((refund) =>
        refund.id === refundId
          ? {
              ...refund,
              status: newStatus,
              updatedAt: new Date().toISOString(),
              timeline: [
                ...refund.timeline,
                {
                id: Math.random().toString(36).slice(2),
                  timestamp: new Date().toISOString(),
                  action: newStatus.toLowerCase(),
                  description: `Status alterado para ${statusConfig[newStatus].label}`,
                  user: "Admin",
                },
              ],
            }
          : refund,
      ),
    );
    setSelectedRefund(null);
    setIsModalOpen(false);
    toast({
      title: "Status atualizado",
      description: `Reembolso marcado como ${statusConfig[newStatus].label}.`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Operações</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Reembolsos</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Gerencie solicitações de reembolso com visibilidade completa das etapas, valores e riscos envolvidos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleCopyPublicLink}
            className="rounded-lg border border-border bg-secondary text-sm font-semibold"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Copiar link público
          </Button>
          <Button
            variant="outline"
            className="rounded-lg border border-border text-sm font-semibold"
            asChild
          >
            <Link to={`/store/${storeId}/refunds/setup`}>
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Link>
          </Button>
          <Button className="rounded-lg bg-brand-purple text-sm font-semibold shadow-md hover:bg-brand-purple/90">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm font-semibold text-muted-foreground">Total de reembolsos</p>
            <p className="text-3xl font-bold text-foreground">{totalRefunds}</p>
            <p className="text-xs text-muted-foreground">Inclui solicitações concluídas e em andamento</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm font-semibold text-muted-foreground">Em análise</p>
            <p className="text-3xl font-bold text-brand-orange">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Solicitações aguardando aprovação ou processamento</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm font-semibold text-muted-foreground">Concluídos</p>
            <p className="text-3xl font-bold text-brand-green">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Reembolsos finalizados com sucesso</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border bg-card shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm font-semibold text-muted-foreground">Valor médio</p>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(averageValue)}</p>
            <p className="text-xs text-muted-foreground">Ticket médio considerando solicitações abertas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="kanban" className="space-y-6">
        <TabsList className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/60 p-1 text-muted-foreground shadow-sm">
          <TabsTrigger
            value="kanban"
            className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all data-[state=active]:bg-brand-purple data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Kanban
          </TabsTrigger>
          <TabsTrigger
            value="lista"
            className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all data-[state=active]:bg-brand-purple data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Lista
          </TabsTrigger>
          <TabsTrigger
            value="resumo"
            className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all data-[state=active]:bg-brand-purple data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Resumo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, protocolo ou pedido"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border border-border bg-card pl-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RefundItem["status"] | "all")}>
              <SelectTrigger className="w-full rounded-xl border border-border bg-card text-sm sm:w-56">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOrder.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusConfig[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="grid min-w-[900px] gap-4 sm:grid-cols-3 xl:grid-cols-6">
              {kanbanColumns.map((column) => (
                <Card key={column.status} className="flex flex-col rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", column.indicator)} />
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        {column.label}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{column.items.length}</span>
                  </div>
                  <div className="space-y-3 overflow-y-auto p-3">
                    {column.items.map((refund) => (
                      <Card
                        key={refund.id}
                        className="cursor-pointer border border-border bg-background shadow-xs transition hover:shadow-md"
                        onClick={() => {
                          setSelectedRefund(refund);
                          setIsModalOpen(true);
                        }}
                      >
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold text-brand-purple">{refund.protocol}</p>
                              <p className="text-xs text-muted-foreground">Pedido {refund.orderId}</p>
                            </div>
                            <Badge className={cn("border-none text-xs font-semibold", column.chip)}>
                              {statusConfig[refund.status].label}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-foreground">{refund.customer.name}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{methodConfig[refund.method].label}</span>
                              <span>Risco {refund.riskScore}%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-brand-green">
                              {formatCurrency(refund.requestedAmount)}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {column.items.length === 0 && (
                      <div className="py-10 text-center text-xs text-muted-foreground">Nenhum item</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lista" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, protocolo ou pedido"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border border-border bg-card pl-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RefundItem["status"] | "all")}>
              <SelectTrigger className="w-full rounded-xl border border-border bg-card text-sm sm:w-56">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOrder.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusConfig[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border border-border bg-card shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-secondary/60">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      <th className="p-4">Protocolo</th>
                      <th className="p-4">Pedido</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Método</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4">Risco</th>
                      <th className="p-4">Atualizado</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRefunds.map((refund) => (
                      <tr
                        key={refund.id}
                        className="cursor-pointer border-b border-border/60 transition hover:bg-muted/40"
                        onClick={() => {
                          setSelectedRefund(refund);
                          setIsModalOpen(true);
                        }}
                      >
                        <td className="p-4 text-sm font-medium text-foreground">{refund.protocol}</td>
                        <td className="p-4 text-sm text-foreground">{refund.orderId}</td>
                        <td className="p-4">
                          <p className="text-sm font-medium text-foreground">{refund.customer.name}</p>
                          {refund.customer.email && (
                            <p className="text-xs text-muted-foreground">{refund.customer.email}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={cn("border-none text-xs font-semibold", methodConfig[refund.method].chip)}>
                            {methodConfig[refund.method].label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={cn("border-none text-xs font-semibold", statusConfig[refund.status].chip)}>
                            {statusConfig[refund.status].label}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm font-semibold text-brand-green">
                          {formatCurrency(refund.requestedAmount)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{refund.riskScore}%</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(refund.updatedAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRefunds.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada</p>
                  <p className="text-xs text-muted-foreground">
                    Ajuste os filtros ou verifique outro período.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumo" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardContent className="space-y-1 p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Taxa de aprovação
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {totalRefunds ? Math.round((completedCount / totalRefunds) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Comparação baseada no total de solicitações</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardContent className="space-y-1 p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Clientes impactados
                </div>
                <p className="text-3xl font-bold text-foreground">{refunds.length}</p>
                <p className="text-xs text-muted-foreground">Total de clientes com solicitações de reembolso</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardContent className="space-y-1 p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Valor solicitado
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(refunds.reduce((sum, refund) => sum + refund.requestedAmount, 0))}
                </p>
                <p className="text-xs text-muted-foreground">Soma de todos os reembolsos registrados</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardContent className="space-y-1 p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Última atualização
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {refunds.length ? new Date(refunds[0].updatedAt).toLocaleDateString("pt-BR") : "--"}
                </p>
                <p className="text-xs text-muted-foreground">Data da última mudança de status</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground">Distribuição por status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusDistribution.map((item) => (
                <div key={item.status} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={cn("h-2 w-2 rounded-full", statusConfig[item.status].indicator)} />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                  <div className="flex flex-1 items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", statusConfig[item.status].indicator)}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-foreground">{item.count}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground">Motivos principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reasonSummary.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem dados suficientes para exibir.</p>
                )}
                {reasonSummary.map(({ reason, count }) => (
                  <div key={reason} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{reason}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand-purple"
                        style={{ width: `${refunds.length ? (count / refunds.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground">Métodos utilizados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {methodDistribution.map((item) => (
                  <div key={item.method} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand-blue"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <RefundDetailsModal
        refund={selectedRefund}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
