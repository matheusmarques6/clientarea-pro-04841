import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, RefreshCw, TrendingUp, DollarSign, ShoppingCart, Mail, Package, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/hooks/useStores';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StoreDashboard = () => {
  const { id: storeId } = useParams();
  const { store, isLoading: storeLoading } = useStore(storeId!);
  const { 
    kpis, 
    revenueSeries, 
    loading, 
    syncing, 
    error, 
    syncData, 
    refetch,
    checkIntegrations 
  } = useDashboardData(storeId!);
  const { toast } = useToast();

  // Estados para filtros de data
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, string>>({});

  // Verificar status das integrações ao carregar
  useEffect(() => {
    if (storeId) {
      checkIntegrations().then(setIntegrationStatus);
    }
  }, [storeId]);

  // Atualizar dados quando o período mudar
  useEffect(() => {
    if (storeId && dateRange.from && dateRange.to) {
      const startDate = dateRange.from.toISOString();
      const endDate = dateRange.to.toISOString();
      refetch(startDate, endDate);
    }
  }, [dateRange, storeId]);

  // Handler para sincronização manual
  const handleSync = async () => {
    if (!storeId || !dateRange.from || !dateRange.to) return;
    
    try {
      await syncData(dateRange.from.toISOString(), dateRange.to.toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  // Dados para o gráfico de pizza (canais de receita)
  const channelData = kpis ? [
    { name: 'E-mail', value: kpis.email_revenue, color: '#10b981' },
    { name: 'SMS', value: kpis.sms_revenue, color: '#f59e0b' },
    { name: 'WhatsApp', value: kpis.whatsapp_revenue, color: '#25d366' },
    { name: 'Outros', value: Math.max(0, kpis.total_revenue - kpis.convertfy_revenue), color: '#6b7280' },
  ].filter(item => item.value > 0) : [];

  if (storeLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loja não encontrada</h2>
          <p className="text-muted-foreground mb-4">A loja solicitada não foi encontrada ou você não tem permissão para acessá-la.</p>
          <Button asChild>
            <Link to="/stores">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às lojas
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: kpis?.currency || 'BRL'
    }).format(value);
  };

  // Calcular crescimento (simulado por enquanto)
  const growthRate = 12.5;

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-muted-foreground">
            Dashboard de {format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} até {format(dateRange.to, "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status das integrações */}
          <div className="flex gap-2">
            <Badge variant={integrationStatus.shopify === 'connected' ? 'default' : 'secondary'}>
              Shopify: {integrationStatus.shopify === 'connected' ? 'Conectado' : 'Desconectado'}
            </Badge>
            <Badge variant={integrationStatus.klaviyo === 'connected' ? 'default' : 'secondary'}>
              Klaviyo: {integrationStatus.klaviyo === 'connected' ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
          
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* Mostrar erro se houver */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.total_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +{growthRate}% vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Convertfy</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.convertfy_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              E-mail: {formatCurrency(kpis?.email_revenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem CFY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.total_revenue ? ((kpis.convertfy_revenue / kpis.total_revenue) * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Da receita total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.order_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Período selecionado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Convertfy Impact Card */}
      {kpis && kpis.total_revenue > 0 && (
        <Card className="glass-card bg-gradient-premium shadow-premium animate-hover relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5"></div>
          <CardContent className="p-6 sm:p-8 relative">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                  Impacto da Convertfy no seu Faturamento
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Veja quanto a Convertfy representa do seu faturamento total no período
                </p>
              </div>
              <div className="text-center lg:text-right">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-premium leading-none mb-2">
                  {((kpis.convertfy_revenue / kpis.total_revenue) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(kpis.convertfy_revenue)} de {formatCurrency(kpis.total_revenue)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Receita ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString()}`} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), "dd 'de' MMMM", { locale: ptBR })}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="total_revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total" />
                <Area type="monotone" dataKey="email_revenue" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="E-mail" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Dados não disponíveis para o período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to={`/store/${storeId}/returns`}>
                <RefreshCw className="h-6 w-6" />
                <span>Trocas & Devoluções</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to={`/store/${storeId}/refunds`}>
                <DollarSign className="h-6 w-6" />
                <span>Reembolsos</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to={`/store/${storeId}/costs`}>
                <Package className="h-6 w-6" />
                <span>Custo de Produto</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreDashboard;