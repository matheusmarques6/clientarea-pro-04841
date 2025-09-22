import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Store, TrendingUp, CheckCircle, XCircle, Clock, ShoppingBag, BarChart3, DollarSign, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStores } from '@/hooks/useStores';

const StoreSelector = () => {
  const navigate = useNavigate();
  const { stores, loading } = useStores();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'disconnected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectada';
      case 'active':
        return 'Ativa';
      case 'pending':
        return 'Pendente';
      case 'disconnected':
        return 'Desconectada';
      default:
        return 'Indefinido';
    }
  };

  const formatRevenue = (revenue: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(revenue);
  };

  if (loading) {
    return (
      <div className="center-screen">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="space-y-8">
            <div className="animate-pulse space-y-4 text-center">
              <div className="h-10 bg-muted rounded-lg w-1/3 mx-auto"></div>
              <div className="h-5 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-muted rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="space-y-8 lg:space-y-12">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Suas Lojas
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                Selecione uma loja para acessar o dashboard e gerenciar suas operações
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          {stores.length > 0 && (
            <div className="bg-white/50 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">
                    {stores.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stores.length === 1 ? 'Loja' : 'Lojas'} Ativa{stores.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">
                    {stores.filter(s => s.status === 'connected').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Conectadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                    {stores.filter(s => s.status !== 'connected').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pendentes</div>
                </div>
              </div>
            </div>
          )}

          {/* Stores Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stores.length > 0 ? stores.map((store, index) => (
              <Card 
                key={store.id} 
                className="group relative overflow-hidden bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
                          <Store className="h-6 w-6 text-white" />
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          store.status === 'connected' ? 'bg-green-500' : 
                          store.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-foreground truncate">
                          {store.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{store.country || 'BR'}</span>
                          <span>•</span>
                          <span className="font-medium">{store.currency || 'BRL'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={getStatusVariant(store.status || 'disconnected')}
                      className="shrink-0"
                    >
                      {getStatusText(store.status || 'disconnected')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-6">
                  {/* Store Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Status da Integração</span>
                      <div className="flex items-center gap-2">
                        {store.status === 'connected' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : store.status === 'pending' ? (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {store.status === 'connected' ? 'Online' : 
                           store.status === 'pending' ? 'Aguardando' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <Button asChild className="w-full h-12 font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg">
                      <Link to={`/store/${store.id}`} className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button asChild size="sm" variant="outline" className="hover:bg-primary/10 hover:border-primary/20">
                        <Link to={`/store/${store.id}/returns`} className="flex flex-col items-center gap-1 py-3 h-auto">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-xs">Trocas</span>
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="hover:bg-primary/10 hover:border-primary/20">
                        <Link to={`/store/${store.id}/refunds`} className="flex flex-col items-center gap-1 py-3 h-auto">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-xs">Reembolsos</span>
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="hover:bg-primary/10 hover:border-primary/20">
                        <Link to={`/store/${store.id}/costs`} className="flex flex-col items-center gap-1 py-3 h-auto">
                          <Package className="h-4 w-4" />
                          <span className="text-xs">Custos</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full">
                <Card className="bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardContent className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/20 rounded-full mb-6">
                      <Store className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Nenhuma loja encontrada</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Ainda não há lojas configuradas em sua conta. Entre em contato com o suporte para começar.
                    </p>
                    <Button variant="outline" className="hover:bg-primary/10">
                      Entrar em contato
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Help Section */}
          {stores.length > 0 && (
            <div className="text-center">
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <CardContent className="py-8">
                  <h3 className="text-lg font-semibold mb-2">Precisa de ajuda?</h3>
                  <p className="text-muted-foreground mb-4">
                    Nossa equipe está aqui para ajudar você a maximizar seus resultados
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" className="hover:bg-primary/10">
                      Central de Ajuda
                    </Button>
                    <Button variant="outline" className="hover:bg-primary/10">
                      Falar com Suporte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreSelector;