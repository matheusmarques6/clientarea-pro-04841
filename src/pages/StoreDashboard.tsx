import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Percent, ShoppingBag, RefreshCw, Package, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useStore } from '@/hooks/useStores';
import { useDashboardData } from '@/hooks/useDashboardData';
import { TopCampaigns } from '@/components/dashboard/TopCampaigns';
import { LeadsMetrics } from '@/components/dashboard/LeadsMetrics';
import { DetailedKlaviyoMetrics } from '@/components/dashboard/DetailedKlaviyoMetrics';

const StoreDashboard = () => {
  const { id } = useParams();
  const [period, setPeriod] = useState('30d');
  
  const { store, isLoading: storeLoading } = useStore(id!);
  const { 
    kpis, 
    chartData, 
    channelRevenue, 
    klaviyoData,
    rawKlaviyoData,
    topCampaigns, 
    isLoading: dataLoading, 
    isSyncing, 
    syncData, 
    refetch 
  } = useDashboardData(id!, period);

  if (storeLoading || dataLoading) {
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

  const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

  const formatCurrency = (value: number) => {
    const currency = kpis?.currency || store?.currency || 'BRL';
    const symbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
    return `${symbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="px-2 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {period === '30d' ? 'Últimos 30 dias' : period === '14d' ? 'Últimos 14 dias' : 'Últimos 7 dias'} • {kpis?.currency || store?.currency || 'BRL'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={syncData}
            disabled={isSyncing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="14d">14 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex items-center text-success text-sm font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.5%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
              <p className="text-2xl font-bold text-ink mt-1">{formatCurrency(kpis?.total_revenue || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex items-center text-success text-sm font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +8.3%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Faturamento Convertfy</p>
              <p className="text-2xl font-bold text-ink mt-1">
                {formatCurrency(klaviyoData ? (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0) : (kpis?.convertfy_revenue || 0))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
                <Percent className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex items-center text-success text-sm font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +2.1%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Margem CFY</p>
              <p className="text-2xl font-bold text-ink mt-1">
                {(() => {
                  const totalRevenue = kpis?.total_revenue || 0;
                  const convertfyRevenue = klaviyoData ? (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0) : (kpis?.convertfy_revenue || 0);
                  return totalRevenue > 0 ? `${((convertfyRevenue / totalRevenue) * 100).toFixed(1)}%` : '0.0%';
                })()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-50 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex items-center text-success text-sm font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +15.2%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Pedidos Convertfy</p>
              <p className="text-2xl font-bold text-ink mt-1">
                {klaviyoData ? (klaviyoData.conversions_campaigns || 0) + (klaviyoData.conversions_flows || 0) : (kpis?.order_count || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Convertfy Impact Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Impact Card */}
        <Card className="glass-card bg-gradient-premium shadow-premium animate-hover relative overflow-hidden lg:col-span-2">
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
                {klaviyoData && (
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-blue-600">Campanhas</div>
                      <div className="text-lg font-semibold">{formatCurrency(klaviyoData.revenue_campaigns || 0)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-purple-600">Flows</div>
                      <div className="text-lg font-semibold">{formatCurrency(klaviyoData.revenue_flows || 0)}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center lg:text-right">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-premium leading-none mb-2">
                  {(() => {
                    const totalRevenue = kpis?.total_revenue || 0;
                    const convertfyRevenue = klaviyoData ? (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0) : (kpis?.convertfy_revenue || 0);
                    return totalRevenue > 0 ? `${((convertfyRevenue / totalRevenue) * 100).toFixed(1)}%` : '0.0%';
                  })()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(klaviyoData ? (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0) : (kpis?.convertfy_revenue || 0))} de {formatCurrency(kpis?.total_revenue || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Metrics - only show if Klaviyo data exists */}
        {klaviyoData && (
          <div className="space-y-4">
            <LeadsMetrics klaviyoData={klaviyoData} />
          </div>
        )}
      </div>

      {/* Top Campaigns - only show if there are real campaigns */}
      {(topCampaigns.byRevenue.length > 0 || topCampaigns.byConversions.length > 0) ? (
        <TopCampaigns 
          campaignsByRevenue={topCampaigns.byRevenue} 
          campaignsByConversions={topCampaigns.byConversions} 
          currency={kpis?.currency} 
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Configure a integração do Klaviyo para ver dados de campanhas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Faturamento por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Total"
                />
                <Line 
                  type="monotone" 
                  dataKey="convertfy" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="Convertfy"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Receita por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelRevenue}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, percentage }) => `${channel} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {channelRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Detalhadas do Klaviyo */}
      <DetailedKlaviyoMetrics rawData={rawKlaviyoData} />

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to={`/store/${id}/returns`}>
                <RefreshCw className="h-6 w-6" />
                <span>Trocas & Devoluções</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to={`/store/${id}/refunds`}>
                <DollarSign className="h-6 w-6" />
                <span>Reembolsos</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to={`/store/${id}/costs`}>
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