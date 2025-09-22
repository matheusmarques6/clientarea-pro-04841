import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Store, TrendingUp, CheckCircle, XCircle, Clock, ShoppingBag, BarChart3, DollarSign, Package, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStores } from '@/hooks/useStores';
import { useAuth } from '@/hooks/useAuth';
import convertfyLogo from '@/assets/convertfy-logo.png';

const StoreSelector = () => {
  const navigate = useNavigate();
  const { stores, loading } = useStores();
  const { signOut, user } = useAuth();

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

  
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="layout-center bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <header className="border-b border-border/40 bg-white/80 backdrop-blur-lg w-full">
          <div className="layout-container px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <img src={convertfyLogo} alt="Convertfy" className="h-8 w-auto" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-32 bg-muted/50 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-muted/50 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="layout-container px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="h-12 bg-muted/50 rounded-lg w-1/3 mx-auto animate-pulse"></div>
              <div className="h-6 bg-muted/50 rounded w-2/3 mx-auto animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-muted/50 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout-center bg-gradient-to-br from-background via-background to-muted/20">
      {/* Modern Header */}
      <header className="border-b border-border/40 bg-white/80 backdrop-blur-lg sticky top-0 z-50 w-full">
        <div className="layout-container px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={convertfyLogo} alt="Convertfy" className="h-8 w-auto" />
              <div className="hidden sm:block">
                <span className="text-lg font-semibold text-foreground">Suas Lojas</span>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-container px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-3xl shadow-lg mb-6">
              <Store className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent leading-tight">
                Suas Lojas
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Selecione uma loja para acessar o dashboard e gerenciar suas operações de forma centralizada
              </p>
            </div>
          </div>

          {/* Enhanced Stats Section */}
          {stores.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-3xl"></div>
              <Card className="relative bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    <div className="text-center space-y-2">
                      <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {stores.length}
                      </div>
                      <div className="text-sm sm:text-base text-muted-foreground font-medium">
                        {stores.length === 1 ? 'Loja Ativa' : 'Lojas Ativas'}
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-3xl sm:text-4xl font-bold text-green-600">
                        {stores.filter(s => s.status === 'connected').length}
                      </div>
                      <div className="text-sm sm:text-base text-muted-foreground font-medium">Conectadas</div>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-3xl sm:text-4xl font-bold text-orange-600">
                        {stores.filter(s => s.status !== 'connected').length}
                      </div>
                      <div className="text-sm sm:text-base text-muted-foreground font-medium">Pendentes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Stores Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {stores.length > 0 ? stores.map((store, index) => (
              <Card 
                key={store.id} 
                className="group relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-2xl animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur"></div>
                
                <CardHeader className="relative pb-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Store className="h-7 w-7 text-white" />
                        </div>
                        {/* Enhanced status indicator */}
                        <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full border-3 border-white shadow-lg ${
                          store.status === 'connected' ? 'bg-green-500' : 
                          store.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          <div className={`absolute inset-0 rounded-full animate-ping ${
                            store.status === 'connected' ? 'bg-green-400' : 
                            store.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                          }`}></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                          {store.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="font-medium">{store.country || 'BR'}</span>
                          <span>•</span>
                          <span className="font-semibold">{store.currency || 'BRL'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={getStatusVariant(store.status || 'disconnected')}
                    className="w-fit"
                  >
                    {getStatusText(store.status || 'disconnected')}
                  </Badge>
                </CardHeader>

                <CardContent className="relative space-y-6 pb-8">
                  {/* Enhanced Store Info */}
                  <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Status da Integração</span>
                      <div className="flex items-center gap-2">
                        {store.status === 'connected' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : store.status === 'pending' ? (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="text-sm font-bold">
                          {store.status === 'connected' ? 'Online' : 
                           store.status === 'pending' ? 'Aguardando' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Quick Actions */}
                  <div className="space-y-4">
                    <Button 
                      asChild 
                      className="w-full h-14 font-bold text-base bg-gradient-to-r from-primary via-primary/95 to-primary/90 hover:from-primary/90 hover:via-primary/85 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                    >
                      <Link to={`/store/${store.id}`} className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5" />
                        Acessar Dashboard
                      </Link>
                    </Button>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Button 
                        asChild 
                        size="sm" 
                        variant="outline" 
                        className="hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-300 rounded-xl"
                      >
                        <Link to={`/store/${store.id}/returns`} className="flex flex-col items-center gap-2 py-4 h-auto">
                          <TrendingUp className="h-5 w-5" />
                          <span className="text-xs font-semibold">Trocas</span>
                        </Link>
                      </Button>
                      <Button 
                        asChild 
                        size="sm" 
                        variant="outline" 
                        className="hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-300 rounded-xl"
                      >
                        <Link to={`/store/${store.id}/refunds`} className="flex flex-col items-center gap-2 py-4 h-auto">
                          <DollarSign className="h-5 w-5" />
                          <span className="text-xs font-semibold">Reembolsos</span>
                        </Link>
                      </Button>
                      <Button 
                        asChild 
                        size="sm" 
                        variant="outline" 
                        className="hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-300 rounded-xl"
                      >
                        <Link to={`/store/${store.id}/costs`} className="flex flex-col items-center gap-2 py-4 h-auto">
                          <Package className="h-5 w-5" />
                          <span className="text-xs font-semibold">Custos</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full">
                <Card className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-3xl overflow-hidden">
                  <CardContent className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-muted/30 to-muted/20 rounded-full mb-8">
                      <Store className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Nenhuma loja encontrada</h3>
                    <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto leading-relaxed">
                      Ainda não há lojas configuradas em sua conta. Entre em contato com nosso suporte para começar.
                    </p>
                    <Button variant="outline" size="lg" className="hover:bg-primary/10 hover:border-primary/30">
                      Entrar em contato
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Enhanced Help Section */}
          {stores.length > 0 && (
            <div className="text-center">
              <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-3xl overflow-hidden">
                <CardContent className="py-12">
                  <h3 className="text-2xl font-bold mb-4">Precisa de ajuda?</h3>
                  <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                    Nossa equipe especializada está pronta para ajudar você a maximizar seus resultados e otimizar suas operações
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="outline" size="lg" className="hover:bg-primary/10 hover:border-primary/30">
                      Central de Ajuda
                    </Button>
                    <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90 shadow-lg">
                      Falar com Suporte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StoreSelector;