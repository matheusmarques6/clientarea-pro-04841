import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Percent, PiggyBank, RefreshCw, Package, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { mockStores, mockDashboardStats, mockChannelRevenue, mockChartData } from '@/lib/mockData';

const StoreDashboard = () => {
  const { id } = useParams();
  const [period, setPeriod] = useState('30d');
  
  const store = mockStores.find(s => s.id === id);
  const stats = mockDashboardStats;

  if (!store) {
    return <div>Loja não encontrada</div>;
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

  const formatCurrency = (value: number) => {
    return `${store.currency === 'BRL' ? 'R$' : store.currency === 'USD' ? '$' : store.currency === 'EUR' ? '€' : '£'} ${value.toLocaleString()}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {period === '30d' ? 'Últimos 30 dias' : period === '14d' ? 'Últimos 14 dias' : 'Últimos 7 dias'} • {store.currency}
          </p>
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
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.faturamentoTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Receita total do período
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Convertfy
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.faturamentoConvertfy)}</div>
            <p className="text-xs text-muted-foreground">
              Receita via Convertfy
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margem CFY
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.margemCFY}%</div>
            <p className="text-xs text-muted-foreground">
              Margem de conversão
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro Líquido CFY
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.lucroLiquidoCFY)}</div>
            <p className="text-xs text-muted-foreground">
              Lucro após custos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Convertfy Impact Card */}
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
                {((stats.faturamentoConvertfy / stats.faturamentoTotal) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(stats.faturamentoConvertfy)} de {formatCurrency(stats.faturamentoTotal)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Faturamento por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockChartData}>
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
                  data={mockChannelRevenue}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, percentage }) => `${channel} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {mockChannelRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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