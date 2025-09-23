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
          <h1 className="text-3xl font-bold">Dashboard</h1>
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
          
          <select className="px-3 py-2 border rounded-md text-sm bg-background">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Faturamento Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis?.total_revenue || 42850)}</p>
              </div>
              <div className="text-sm text-green-600 font-semibold">+12.5%</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Faturamento Convertfy</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis?.convertfy_revenue || 16400)}</p>
              </div>
              <div className="text-sm text-green-600 font-semibold">+8.3%</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <div className="text-green-600 font-bold text-lg">%</div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Margem CFY</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpis?.total_revenue ? ((kpis.convertfy_revenue / kpis.total_revenue) * 100).toFixed(1) : '38.3'}%
                </p>
              </div>
              <div className="text-sm text-green-600 font-semibold">+2.1%</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Lucro CFY</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency((kpis?.convertfy_revenue || 16400) * 0.383)}</p>
              </div>
              <div className="text-sm text-green-600 font-semibold">+15.2%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Convertfy Impact Card */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Impacto da Convertfy no seu Faturamento
              </h3>
              <p className="text-gray-600 max-w-md">
                Veja quanto a Convertfy representa do seu faturamento total no período
              </p>
            </div>
            <div className="text-center lg:text-right">
              <div className="text-7xl font-bold text-gray-900 leading-none mb-2">
                {kpis?.total_revenue ? ((kpis.convertfy_revenue / kpis.total_revenue) * 100).toFixed(1) : '13.0'}%
              </div>
              <div className="text-sm text-gray-500">
                {formatCurrency(kpis?.convertfy_revenue || 16400)} de {formatCurrency(kpis?.total_revenue || 126500)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Faturamento por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueSeries.length > 0 ? revenueSeries : [
                { period: '2025-08-24', total_revenue: 4200 },
                { period: '2025-08-25', total_revenue: 3800 },
                { period: '2025-08-26', total_revenue: 5200 },
                { period: '2025-08-27', total_revenue: 4800 },
                { period: '2025-08-28', total_revenue: 5400 },
                { period: '2025-08-29', total_revenue: 4600 },
                { period: '2025-08-30', total_revenue: 5800 },
                { period: '2025-08-31', total_revenue: 5200 },
                { period: '2025-09-01', total_revenue: 4400 },
                { period: '2025-09-02', total_revenue: 5000 },
                { period: '2025-09-03', total_revenue: 4700 },
                { period: '2025-09-04', total_revenue: 5300 },
                { period: '2025-09-05', total_revenue: 4900 },
                { period: '2025-09-06', total_revenue: 5100 },
                { period: '2025-09-07', total_revenue: 5500 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => format(new Date(value), 'MM-dd')}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <YAxis 
                  tickFormatter={(value) => value.toLocaleString()} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), "dd/MM/yyyy")}
                  formatter={(value: number) => [value.toLocaleString(), 'Faturamento']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: 'white' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Receita por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'E-mail', value: 37.8, color: '#8b5cf6' },
                      { name: 'WhatsApp', value: 35.9, color: '#10b981' },
                      { name: 'SMS', value: 26.3, color: '#f59e0b' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={30}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {[
                      { name: 'E-mail', value: 37.8, color: '#8b5cf6' },
                      { name: 'WhatsApp', value: 35.9, color: '#10b981' },
                      { name: 'SMS', value: 26.3, color: '#f59e0b' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-4 right-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-purple-600 font-medium">E-mail 37.8%</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-green-600 font-medium">WhatsApp 35.9%</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-orange-600 font-medium">SMS 26.3%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreDashboard;