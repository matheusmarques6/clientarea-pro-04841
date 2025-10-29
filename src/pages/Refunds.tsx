import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
  Copy,
  Check,
  Globe,
} from "lucide-react";
import { RefundDetailsModal } from "@/components/refunds/RefundDetailsModal";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

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
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    attachments: ["photo1.jpg"],
    timeline: [
      {
        id: "1",
        timestamp: daysAgo(2),
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
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
    attachments: [],
    timeline: [
      {
        id: "1",
        timestamp: daysAgo(5),
        action: "created",
        description: "Solicitação de reembolso criada",
        user: "Carlos Mendes",
      },
      {
        id: "2",
        timestamp: daysAgo(4),
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
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublicLinkDialogOpen, setIsPublicLinkDialogOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<RefundItem["status"] | "all">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Função para carregar refunds do banco de dados
  const loadRefunds = useCallback(async () => {
    try {
      setIsLoading(true);

      // Mapear status do banco para o frontend
      type DbStatus = 'new' | 'review' | 'approved' | 'awaiting_post' | 'received_dc' | 'done' | 'rejected';
      const dbToFrontendStatus: Record<DbStatus, RefundItem["status"]> = {
        'new': 'REQUESTED',
        'review': 'UNDER_REVIEW',
        'approved': 'APPROVED',
        'awaiting_post': 'PROCESSING',
        'received_dc': 'PROCESSING',
        'done': 'COMPLETED',
        'rejected': 'REJECTED',
      };

      // Buscar refunds do banco
      const { data: returnsData, error: returnsError } = await supabase
        .from('returns')
        .select('*')
        .eq('type', 'refund')
        .order('created_at', { ascending: false });

      if (returnsError) throw returnsError;

      if (!returnsData || returnsData.length === 0) {
        setRefunds([]);
        setIsLoading(false);
        return;
      }

      // Buscar eventos de timeline para cada refund
      const { data: eventsData, error: eventsError } = await supabase
        .from('return_events')
        .select('*')
        .in('return_id', returnsData.map(r => r.id))
        .order('created_at', { ascending: true });

      if (eventsError) throw eventsError;

      // Mapear dados para o formato do frontend
      const mappedRefunds: RefundItem[] = returnsData.map(returnData => {
        const events = eventsData?.filter(e => e.return_id === returnData.id) || [];

        return {
          id: returnData.id,
          protocol: returnData.code || `RB-${returnData.id.substring(0, 8)}`,
          orderId: returnData.order_code,
          customer: {
            name: returnData.customer_name,
            email: returnData.customer_email || '',
            phone: returnData.customer_phone || undefined,
          },
          items: [], // TODO: buscar itens se houver tabela relacionada
          requestedAmount: returnData.amount || 0,
          finalAmount: returnData.amount || 0,
          method: 'CARD', // TODO: buscar método real se estiver salvo
          reason: returnData.reason || 'Não especificado',
          status: dbToFrontendStatus[returnData.status as DbStatus] || 'REQUESTED',
          riskScore: 0, // TODO: calcular score se necessário
          createdAt: returnData.created_at || new Date().toISOString(),
          updatedAt: returnData.updated_at || returnData.created_at || new Date().toISOString(),
          attachments: [], // TODO: buscar anexos se houver
          timeline: events.map(event => ({
            id: event.id,
            timestamp: event.created_at || new Date().toISOString(),
            action: event.to_status,
            description: event.reason || `Status alterado para ${event.to_status}`,
            user: 'Admin',
          })),
        };
      });

      setRefunds(mappedRefunds);
    } catch (error) {
      console.error('Erro ao carregar refunds:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os reembolsos.",
        variant: "destructive",
      });
      // Em caso de erro, usar dados mockados
      setRefunds(mockRefunds);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Carregar refunds ao montar o componente
  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

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

  const handleCopyLinkToClipboard = () => {
    const publicLink = `${window.location.origin}/refunds/${storeId ?? "loja"}`;
    navigator.clipboard.writeText(publicLink);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
    toast({
      title: "Link copiado!",
      description: "O link público foi copiado para a área de transferência.",
    });
  };

  const handleStatusUpdate = async (refundId: string, newStatus: RefundItem["status"]) => {
    try {
      // Mapear status do frontend para o banco de dados
      type DbStatus = 'new' | 'review' | 'approved' | 'awaiting_post' | 'received_dc' | 'done' | 'rejected';

      const statusMap: Record<RefundItem["status"], DbStatus> = {
        REQUESTED: 'new',
        UNDER_REVIEW: 'review',
        APPROVED: 'approved',
        PROCESSING: 'awaiting_post',
        COMPLETED: 'done',
        REJECTED: 'rejected',
      };

      const dbStatus = statusMap[newStatus];

      // Buscar status atual do reembolso
      const currentRefund = refunds.find(r => r.id === refundId);
      const currentDbStatus = currentRefund ? statusMap[currentRefund.status] : undefined;

      // Atualizar no banco de dados
      const { error: updateError } = await supabase
        .from('returns')
        .update({ status: dbStatus })
        .eq('id', refundId);

      if (updateError) throw updateError;

      // Criar evento na timeline
      await supabase.from('return_events').insert([{
        return_id: refundId,
        from_status: currentDbStatus,
        to_status: dbStatus,
        reason: `Status alterado para ${statusConfig[newStatus].label}`,
      }]);

      setSelectedRefund(null);
      setIsModalOpen(false);

      toast({
        title: "Status atualizado",
        description: `Reembolso marcado como ${statusConfig[newStatus].label}.`,
      });

      // Recarregar dados do banco para refletir as mudanças
      await loadRefunds();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status do reembolso.",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (event: React.DragEvent, refundId: string) => {
    event.dataTransfer.setData("refundId", refundId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: React.DragEvent, newStatus: RefundItem["status"]) => {
    event.preventDefault();
    const refundId = event.dataTransfer.getData("refundId");

    if (!refundId) return;

    const refund = refunds.find((r) => r.id === refundId);
    if (!refund || refund.status === newStatus) return;

    setRefunds((prev) =>
      prev.map((r) =>
        r.id === refundId
          ? {
              ...r,
              status: newStatus,
              updatedAt: new Date().toISOString(),
              timeline: [
                ...r.timeline,
                {
                  id: Math.random().toString(36).slice(2),
                  timestamp: new Date().toISOString(),
                  action: newStatus.toLowerCase(),
                  description: `Status alterado para ${statusConfig[newStatus].label}`,
                  user: "Admin",
                },
              ],
            }
          : r,
      ),
    );

    toast({
      title: "Status atualizado",
      description: `Reembolso movido para ${statusConfig[newStatus].label}.`,
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(124, 58, 237); // brand-purple
    doc.text("Relatório de Reembolsos", 14, 22);

    // Store info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Loja: ${storeId || "N/A"}`, 14, 30);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 36);
    doc.text(`Hora: ${new Date().toLocaleTimeString("pt-BR")}`, 14, 42);

    // Summary stats
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Resumo", 14, 52);

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total de reembolsos: ${totalRefunds}`, 14, 58);
    doc.text(`Em análise: ${pendingCount}`, 14, 63);
    doc.text(`Concluídos: ${completedCount}`, 14, 68);
    doc.text(`Valor médio: ${formatCurrency(averageValue)}`, 14, 73);

    // Table data
    const tableData = filteredRefunds.map((refund) => [
      refund.protocol,
      refund.orderId,
      refund.customer.name,
      statusConfig[refund.status].label,
      methodConfig[refund.method].label,
      formatCurrency(refund.requestedAmount),
      `${refund.riskScore}%`,
      new Date(refund.updatedAt).toLocaleDateString("pt-BR"),
    ]);

    // Table
    autoTable(doc, {
      startY: 80,
      head: [["Protocolo", "Pedido", "Cliente", "Status", "Método", "Valor", "Risco", "Data"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [124, 58, 237], // brand-purple
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 80, left: 14, right: 14 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    // Save
    doc.save(`reembolsos-${storeId || "loja"}-${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "PDF exportado",
      description: "O relatório de reembolsos foi exportado com sucesso.",
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
            onClick={handleExportPDF}
            className="rounded-lg bg-brand-purple text-sm font-semibold shadow-md hover:bg-brand-purple/90"
          >
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
        <TabsList className="flex w-full rounded-2xl border border-border bg-card/80 text-muted-foreground shadow-lg shadow-black/5 p-1 sm:p-1.5 gap-1">
          <TabsTrigger
            value="kanban"
            className="flex-1 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 ease-out data-[state=active]:bg-brand-purple data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-muted/60 hover:text-foreground"
          >
            Kanban
          </TabsTrigger>
          <TabsTrigger
            value="lista"
            className="flex-1 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 ease-out data-[state=active]:bg-brand-purple data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-muted/60 hover:text-foreground"
          >
            Lista
          </TabsTrigger>
          <TabsTrigger
            value="resumo"
            className="flex-1 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 ease-out data-[state=active]:bg-brand-purple data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-muted/60 hover:text-foreground"
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
                <Card
                  key={column.status}
                  className="flex flex-col rounded-2xl border border-border bg-card shadow-sm"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.status)}
                >
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
                        draggable
                        onDragStart={(e) => handleDragStart(e, refund.id)}
                        className="cursor-grab border border-border bg-background shadow-xs transition hover:shadow-md active:cursor-grabbing"
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
                  {new Date().toLocaleDateString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">Atualizado hoje às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
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

      <Dialog open={isPublicLinkDialogOpen} onOpenChange={setIsPublicLinkDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Copiar link público</DialogTitle>
            <DialogDescription>
              Compartilhe este link com seus clientes para que eles possam solicitar reembolsos diretamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Link público do portal</h3>
                <Badge variant="outline" className="text-xs">
                  <Globe className="mr-1 h-3 w-3" />
                  Público
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/refunds/${storeId ?? "loja"}`}
                  readOnly
                  className="flex-1 bg-muted/50 font-mono text-sm"
                />
                <Button
                  onClick={handleCopyLinkToClipboard}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  {isLinkCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Configurações atuais</h3>

              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prazo para arrependimento</span>
                    <Badge variant="secondary" className="font-semibold">7 dias</Badge>
                  </div>
                  <Separator className="opacity-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prazo para defeito</span>
                    <Badge variant="secondary" className="font-semibold">30 dias</Badge>
                  </div>
                  <Separator className="opacity-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Métodos disponíveis</span>
                    <div className="flex gap-1">
                      <Badge className="bg-brand-purple-light text-brand-purple text-xs">Cartão</Badge>
                      <Badge className="bg-brand-green-light text-brand-green text-xs">PIX</Badge>
                      <Badge className="bg-brand-orange-light text-brand-orange text-xs">Voucher</Badge>
                    </div>
                  </div>
                  <Separator className="opacity-50" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Aprovação automática até</span>
                    <Badge variant="secondary" className="font-semibold">R$ 100,00</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Personalize suas configurações
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Acesse as configurações para alterar prazos, métodos de pagamento e outras opções do portal.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  onClick={() => {
                    setIsPublicLinkDialogOpen(false);
                    navigate(`/store/${storeId}/formulario#refund-config`);
                  }}
                >
                  Ir para configurações →
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
