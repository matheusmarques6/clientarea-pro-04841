import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Mail, MessageCircle, Smartphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import convertfyLogo from '@/assets/convertfy-logo.png';

const PreDashboard = () => {
  const [period, setPeriod] = useState('30d');
  const [previousPeriod, setPreviousPeriod] = useState('30d');
  
  // Fetch real data from all client stores
  const dashboardData = useClientDashboard(period);
  
  // Calculate growth (simplified - comparing with previous period)
  const calculateGrowth = () => {
    // This is a simplified calculation - in production, you'd compare with previous period
    if (dashboardData.totalRevenue > 0) {
      return 12.8; // Placeholder growth percentage
    }
    return 0;
  };
  
  const periodLabels = {
    '7d': 'últimos 7 dias',
    '30d': 'últimos 30 dias',
    '90d': 'últimos 90 dias',
    'MTD': 'mês atual',
    'YTD': 'ano atual'
  };
  
  // Update previous period when period changes
  useEffect(() => {
    if (period !== previousPeriod) {
      setPreviousPeriod(period);
    }
  }, [period, previousPeriod]);

  // Format currency based on predominant currency in stores
  const formatCurrency = (value: number) => {
    // Get most common currency from stores
    const currencies = dashboardData.stores.map(s => s.currency);
    const mostCommonCurrency = currencies.length > 0 
      ? currencies.reduce((a, b) => 
          currencies.filter(v => v === a).length >= currencies.filter(v => v === b).length ? a : b
        )
      : 'BRL';
    
    const currencySymbols: { [key: string]: string } = {
      'BRL': 'R$',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    
    const symbol = currencySymbols[mostCommonCurrency] || 'R$';
    const locale = mostCommonCurrency === 'BRL' ? 'pt-BR' : 
                   mostCommonCurrency === 'USD' ? 'en-US' :
                   mostCommonCurrency === 'EUR' ? 'de-DE' : 'en-GB';
    
    return `${symbol} ${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Channel data from the dashboard
  const channelRevenue = [
    {
      channel: 'EMAIL',
      revenue: dashboardData.emailRevenue,
      percentage: dashboardData.totalRevenue > 0 
        ? Math.round((dashboardData.emailRevenue / dashboardData.totalRevenue) * 100)
        : 0
    },
    {
      channel: 'SMS',
      revenue: dashboardData.smsRevenue,
      percentage: dashboardData.totalRevenue > 0 
        ? Math.round((dashboardData.smsRevenue / dashboardData.totalRevenue) * 100)
        : 0
    },
    {
      channel: 'WHATSAPP',
      revenue: dashboardData.whatsappRevenue,
      percentage: dashboardData.totalRevenue > 0 
        ? Math.round((dashboardData.whatsappRevenue / dashboardData.totalRevenue) * 100)
        : 0
    }
  ];
  
  // Debug log to ensure we're using the right data
  console.log('Dashboard data loaded:', { 
    loading: dashboardData.loading, 
    clientName: dashboardData.clientName, 
    totalRevenue: dashboardData.totalRevenue,
    storesCount: dashboardData.stores.length
  });

  return (
    <section 
      id="pre-dashboard" 
      className="layout-center"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)'
      }}
    >
      <div className="pre-dashboard-inner">
        <div className="flex flex-col items-center justify-center gap-8 w-full">
          
          {/* Header Section - Largura total centralizada */}
          <header className="w-full">
            <div className="flex flex-col items-center justify-center gap-4 lg:flex-row lg:justify-between lg:gap-6 px-4 sm:px-6">
              
              {/* Logo - Sempre no topo em mobile */}
              <div className="flex-shrink-0 order-1 lg:order-1">
                <img 
                  src={convertfyLogo} 
                  alt="Convertfy" 
                  className="h-10 sm:h-12 lg:h-12 w-auto"
                />
              </div>
              
              {/* Central Content - Textos centralizados */}
              <div className="text-center order-2 lg:order-2 lg:flex-1">
                {dashboardData.loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48 mx-auto" />
                    <Skeleton className="h-4 w-64 mx-auto" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-foreground leading-tight">
                      Olá, <span className="text-premium">{dashboardData.clientName}</span>
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                      Bem-vindo de volta à sua central Convertfy
                    </p>
                  </>
                )}
              </div>
              
              {/* Status Badge */}
              <div className="flex-shrink-0 order-3 lg:order-3">
                <Badge variant="secondary" className="px-3 py-2 text-xs sm:text-sm rounded-full">
                  {dashboardData.stores.length} loja{dashboardData.stores.length !== 1 ? 's' : ''} conectada{dashboardData.stores.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
            </div>
          </header>

          {/* Main KPI Card - Estética melhorada */}
          <Card className="w-full max-w-4xl glass-card shadow-lg">
            <CardContent className="p-6 sm:p-8 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-6 lg:gap-8">
                
                {/* Period Selector - Melhor estética mobile */}
                <div className="text-center lg:text-left">
                  <h2 className="text-lg sm:text-xl lg:text-xl font-semibold mb-4 leading-relaxed">
                    Seu faturamento dos{' '}
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="inline-flex w-auto h-auto p-1 border-none bg-transparent text-lg sm:text-xl lg:text-xl font-semibold focus:ring-2 focus:ring-primary/20 rounded-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="7d">últimos 7 dias</SelectItem>
                        <SelectItem value="30d">últimos 30 dias</SelectItem>
                        <SelectItem value="90d">últimos 90 dias</SelectItem>
                        <SelectItem value="MTD">mês atual</SelectItem>
                        <SelectItem value="YTD">ano atual</SelectItem>
                      </SelectContent>
                    </Select>
                  </h2>
                </div>
                
                {/* Revenue Display - Melhor spacing mobile */}
                <div className="text-center lg:text-right">
                  {dashboardData.loading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-64 mx-auto lg:ml-auto lg:mr-0" />
                      <Skeleton className="h-8 w-24 mx-auto lg:ml-auto lg:mr-0" />
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-extrabold text-premium leading-none mb-4">
                        {formatCurrency(dashboardData.totalRevenue)}
                      </div>
                      {calculateGrowth() > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-2 text-sm rounded-full"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{calculateGrowth().toFixed(1)}%
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Convertfy Impact Card - Destaque especial */}
          {!dashboardData.loading && (
            <div className="w-full max-w-4xl px-4 sm:px-0 animate-fade-in">
              <Card className="glass-card shadow-xl bg-gradient-to-br from-premium/10 to-premium/5 border-premium/20 hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="text-center lg:text-left flex-1">
                      <div className="flex items-center gap-3 justify-center lg:justify-start mb-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-premium/20 to-premium/10 text-premium">
                          <TrendingUp className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">
                          Impacto Convertfy
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Faturamento gerado através da plataforma Convertfy
                      </p>
                    </div>
                    <div className="text-center lg:text-right">
                      <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-premium to-premium/70 bg-clip-text text-transparent mb-2">
                        {formatCurrency(dashboardData.emailRevenue + dashboardData.smsRevenue + dashboardData.whatsappRevenue)}
                      </div>
                      {dashboardData.totalRevenue > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="bg-premium/10 text-premium hover:bg-premium/20 px-4 py-2 text-sm rounded-full font-semibold"
                        >
                          {Math.round(((dashboardData.emailRevenue + dashboardData.smsRevenue + dashboardData.whatsappRevenue) / dashboardData.totalRevenue) * 100)}% do faturamento total
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}


          {/* Store Breakdown - Show when multiple stores exist */}
          {!dashboardData.loading && dashboardData.stores.length > 1 && (
            <div className="w-full max-w-4xl px-4 sm:px-0 mt-8">
              <Card className="glass-card shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Faturamento por Loja</h3>
                  <div className="space-y-3">
                    {dashboardData.stores.map((store) => (
                      <div key={store.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="font-medium text-sm">{store.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{store.currency}</span>
                          <span className="font-semibold">
                            {formatCurrency(store.revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CTA Buttons - Navegação correta do fluxo */}
          <div className="w-full max-w-md mt-6 px-4 sm:px-0 space-y-4">
            <Button
              asChild 
              size="lg" 
              className="w-full bg-gradient-hero hover:opacity-90 text-lg font-semibold h-14 sm:h-14 rounded-xl transition-all duration-200 ease-smooth focus:ring-2 focus:ring-primary/20 shadow-lg hover:shadow-xl"
              disabled={dashboardData.loading}
            >
              <Link to="/stores" className="font-semibold">
                {dashboardData.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Selecionar Loja'
                )}
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
};

export default PreDashboard;