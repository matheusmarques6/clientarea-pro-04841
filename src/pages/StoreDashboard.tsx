import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Percent, ShoppingBag, RefreshCw, Package, ArrowLeft, Info, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '@/hooks/useStores';
import { useDashboardData } from '@/hooks/useDashboardData';
import { TopCampaigns } from '@/components/dashboard/TopCampaigns';
import { TopFlows } from '@/components/dashboard/TopFlows';
import { CustomerMetrics } from '@/components/dashboard/CustomerMetrics';
import { DetailedKlaviyoMetrics } from '@/components/dashboard/DetailedKlaviyoMetrics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const StoreDashboard = () => {
  const { id } = useParams();
  const [period, setPeriod] = useState('30d');
  const [isVerifyingConnection, setIsVerifyingConnection] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  const { store, isLoading: storeLoading } = useStore(id!);
  const { 
    kpis, 
    chartData, 
    klaviyoData,
    klaviyoSnapshotInfo,
    rawKlaviyoData,
    topCampaigns, 
    topFlows,
    isLoading: dataLoading, 
    isSyncing, 
    needsSync,
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

  const formatCurrency = (value: number) => {
    const currency = kpis?.currency || store?.currency || 'BRL';
    const symbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
    return `${symbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const periodLabelMap: Record<string, string> = {
    today: 'Hoje',
    '7d': 'Últimos 7 dias',
    '14d': 'Últimos 14 dias',
    '30d': 'Últimos 30 dias',
  };

  const periodLabel = periodLabelMap[period] || periodLabelMap['7d'];

  // Verificar se a loja tem credenciais configuradas mas não está conectada
  const hasKlaviyoCredentials = store?.klaviyo_private_key && store?.klaviyo_site_id;
  const hasShopifyCredentials = store?.shopify_access_token && store?.shopify_domain;
  const hasAnyCredentials = hasKlaviyoCredentials || hasShopifyCredentials;
  const needsFirstSync = store?.first_sync_pending || (hasAnyCredentials && store?.status !== 'connected');

  // Wrapper para syncData que verifica e atualiza o status após sincronização
  const handleFirstSync = async () => {
    setIsVerifyingConnection(true);

    try {
      // Executar sincronização
      await syncData();

      // Se a loja precisa de primeira sincronização, verificar se foi bem-sucedida
      if (needsFirstSync) {
        // Aguardar sincronização processar e recarregar dados
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Recarregar dados do dashboard
        await refetch();

        // Aguardar mais um momento para garantir que dados foram carregados
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificar se obteve dados (significa que credenciais estão corretas)
        const hasData = kpis && (kpis.total_revenue > 0 || kpis.order_count > 0);

        if (hasData || !isSyncing) {
          // Atualizar status da loja para connected e remover flag
          const { error } = await supabase
            .from('stores')
            .update({
              status: 'connected',
              first_sync_pending: false
            })
            .eq('id', id!);

          if (!error) {
            toast.success('Loja conectada com sucesso!', {
              description: 'Suas integrações estão funcionando corretamente.',
            });

            // Mostrar alert verde de sucesso
            setSyncSuccess(true);

            // Recarregar dados da loja após um momento
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } else {
          // Se não obteve dados, ainda assim permitir que tente novamente
          toast.info('Sincronização iniciada', {
            description: 'Os dados podem demorar alguns minutos para aparecer.',
          });
        }
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast.error('Erro ao sincronizar', {
        description: 'Verifique suas credenciais nas configura\u00e7\u00f5es da loja.',
      });
    } finally {
      setIsVerifyingConnection(false);
    }
  };

  return (
    <div className="px-2 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {periodLabel} • {kpis?.currency || store?.currency || 'BRL'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={(e) => {
              // Shift+Click = forçar sync (ignora cache)
              const forceSync = e.shiftKey;
              if (needsFirstSync) {
                handleFirstSync();
              } else {
                syncData(forceSync);
              }
            }}
            disabled={isSyncing || isVerifyingConnection}
            variant={needsFirstSync ? "default" : "outline"}
            size="sm"
            className="relative"
            title="Clique para sincronizar. Shift+Clique para forçar atualização ignorando cache."
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(isSyncing || isVerifyingConnection) ? 'animate-spin' : ''}`} />
            {isVerifyingConnection ? 'Verificando...' : isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            {(needsSync || needsFirstSync) && !isSyncing && !isVerifyingConnection && (
              <span
                className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full animate-pulse ${needsFirstSync ? 'bg-blue-500' : 'bg-warning'}`}
                aria-label={needsFirstSync ? "Primeira sincronização necessária" : "Dados desatualizados, sincronize para atualizar."}
              />
            )}
          </Button>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="14d">14 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Success Alert - Green */}
      {syncSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900 relative">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900"
            onClick={() => setSyncSuccess(false)}
          >
            <X className="h-4 w-4 text-green-700 dark:text-green-300" />
          </Button>
          <AlertTitle className="text-green-900 dark:text-green-100 font-semibold">
            Sincronização realizada com sucesso
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200 mt-2">
            Suas credenciais foram verificadas e a importação de dados foi iniciada com sucesso.
          </AlertDescription>
        </Alert>
      )}

      {/* First Sync Alert - Blue (only show if not success) */}
      {needsFirstSync && !syncSuccess && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
            Primeira sincronização necessária
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
            <p className="mb-3">
              Você configurou credenciais de {hasKlaviyoCredentials && hasShopifyCredentials ? 'Klaviyo e Shopify' : hasKlaviyoCredentials ? 'Klaviyo' : 'Shopify'} nesta loja.
              Para começar a visualizar seus dados, clique no botão <strong>"Sincronizar"</strong> destacado no canto superior direito.
            </p>
            <p className="text-sm">
              A sincronização irá verificar suas credenciais e começar a importar dados automaticamente.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center text-success text-sm font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.5%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(kpis?.total_revenue || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center text-success text-sm font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +8.3%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Faturamento Convertfy</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(klaviyoData ? (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0) : (kpis?.convertfy_revenue || 0))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center text-success text-sm font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +2.1%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Margem CFY</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {(() => {
                  const totalRevenue = kpis?.total_revenue || 0;
                  const convertfyRevenue = klaviyoData ? (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0) : (kpis?.convertfy_revenue || 0);
                  return totalRevenue > 0 ? `${((convertfyRevenue / totalRevenue) * 100).toFixed(1)}%` : '0.0%';
                })()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
                <ShoppingBag className="w-5 h-5 text-warning" />
              </div>
              <div className="flex items-center text-success text-sm font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                +15.2%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Pedidos Convertfy</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {klaviyoData ? (klaviyoData.conversions_campaigns || 0) + (klaviyoData.conversions_flows || 0) : (kpis?.order_count || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Convertfy Impact Section */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-stretch">
        {/* Main Impact Card */}
        <Card className="relative overflow-hidden border border-border bg-card shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent dark:from-primary/30 dark:via-primary/15 opacity-80"></div>
          <CardContent className="relative p-6 sm:p-8">
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
                      <div className="font-medium text-primary">Campanhas</div>
                      <div className="text-lg font-semibold text-foreground">{formatCurrency(klaviyoData.revenue_campaigns || 0)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-primary">Flows</div>
                      <div className="text-lg font-semibold text-foreground">{formatCurrency(klaviyoData.revenue_flows || 0)}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center lg:text-right">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary leading-none mb-2">
                  {(() => {
                    const totalRevenue = kpis?.total_revenue || 0;
                    const convertfyRevenue = klaviyoData
                      ? (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0)
                      : (kpis?.convertfy_revenue || 0);
                    return totalRevenue > 0 ? `${((convertfyRevenue / totalRevenue) * 100).toFixed(1)}%` : '0.0%';
                  })()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(
                    klaviyoData
                      ? (klaviyoData.revenue_campaigns || 0) + (klaviyoData.revenue_flows || 0)
                      : (kpis?.convertfy_revenue || 0)
                  )}{' '}
                  de {formatCurrency(kpis?.total_revenue || 0)}
                </div>
              </div>
            </div>
            {klaviyoSnapshotInfo && (
              <div
                className={`mt-4 text-xs flex items-center gap-2 ${
                  klaviyoSnapshotInfo.isFallback ? 'text-warning' : 'text-muted-foreground'
                }`}
              >
                {klaviyoSnapshotInfo.isFallback && <Info className="h-3.5 w-3.5" />}
                <span>
                  {klaviyoSnapshotInfo.isFallback
                    ? `Sem dados sincronizados para ${periodLabel.toLowerCase()}. Exibindo snapshot ${klaviyoSnapshotInfo.label}.`
                    : `Snapshot ${klaviyoSnapshotInfo.label}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Metrics - only show if KPI data exists */}
        {kpis && (
          <CustomerMetrics
            customersDistinct={kpis.customers_distinct}
            customersReturning={kpis.customers_returning}
            layout="grid"
          />
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

      {/* Top Flows - only show if there are real flows */}
      {(topFlows.byRevenue.length > 0 || topFlows.byPerformance.length > 0) ? (
        <TopFlows 
          flowsByRevenue={topFlows.byRevenue} 
          flowsByPerformance={topFlows.byPerformance} 
          currency={kpis?.currency} 
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Flows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Sincronize ou ajuste o período para visualizar os flows do Klaviyo
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
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
