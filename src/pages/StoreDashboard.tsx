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
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Últimos 30 dias • {kpis?.currency || 'BRL'}
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
          
          <select className="px-3 py-2 border rounded-md text-sm">
            <option>30 dias</option>
          </select>
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <DollarSign className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis?.total_revenue || 0)}</p>
              </div>
              <div className="text-sm text-green-600 font-medium">+12.5%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <TrendingUp className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Faturamento Convertfy</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis?.convertfy_revenue || 0)}</p>
              </div>
              <div className="text-sm text-green-600 font-medium">+8.3%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-5 w-5 text-primary mb-2 flex items-center justify-center">%</div>
                <p className="text-sm text-muted-foreground">Margem CFY</p>
                <p className="text-2xl font-bold">
                  {kpis?.total_revenue ? ((kpis.convertfy_revenue / kpis.total_revenue) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
              <div className="text-sm text-green-600 font-medium">+2.1%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Package className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Lucro CFY</p>
                <p className="text-2xl font-bold">{formatCurrency((kpis?.convertfy_revenue || 0) * 0.383)}</p>
              </div>
              <div className="text-sm text-green-600 font-medium">+15.2%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Convertfy Impact Card */}
      {kpis && kpis.total_revenue > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-lg font-semibold mb-2">
                  Impacto da Convertfy no seu Faturamento
                </h3>
                <p className="text-sm text-muted-foreground">
                  Veja quanto a Convertfy representa do seu faturamento total no período
                </p>
              </div>
              <div className="text-center lg:text-right">
                <div className="text-6xl font-bold leading-none mb-2">
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
            <CardTitle>Faturamento por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => format(new Date(value), 'MM-dd')}
                />
                <YAxis tickFormatter={(value) => value.toLocaleString()} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), "dd/MM/yyyy")}
                  formatter={(value: number) => [value.toLocaleString(), 'Faturamento']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
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
              <div className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-4 right-4 space-y-2">
                  {channelData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span>{item.name} {((item.value / (kpis?.total_revenue || 1)) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Dados não disponíveis para o período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreDashboard;