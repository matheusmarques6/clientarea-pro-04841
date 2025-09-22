import { useNavigate } from 'react-router-dom';
import { Store, LogOut, User, HelpCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStores } from '@/hooks/useStores';
import { useAuth } from '@/hooks/useAuth';
import convertfyLogo from '@/assets/convertfy-logo.png';
import StoreCard from '@/components/stores/StoreCard';
import StoreStats from '@/components/stores/StoreStats';
import StoreLoading from '@/components/stores/StoreLoading';

const StoreSelector = () => {
  const navigate = useNavigate();
  const { stores, loading } = useStores();
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return <StoreLoading />;
  }

  return (
    <div className="min-h-screen bg-background w-full flex-1">
      {/* Modern Header - Full Width */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full py-4 bg-white">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <img src={convertfyLogo} alt="Convertfy" className="h-8 w-auto" />
              <div className="hidden sm:block h-6 w-px bg-border" />
              <h1 className="hidden sm:block text-lg font-semibold">Suas Lojas</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full py-12">
        <div className="w-full space-y-12">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <Store className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Suas Lojas
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Selecione uma loja para acessar o dashboard e gerenciar suas operações
              </p>
            </div>
          </div>
          </div>

          {/* Stats Section */}
          {stores.length > 0 && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="max-w-2xl mx-auto">
                <StoreStats stores={stores} />
              </div>
            </div>
          )}

          {/* Stores Grid */}
          <div className="w-full px-4 sm:px-6">
            <div className="space-y-6">
              {stores.length > 0 ? (
                <>
                  <h2 className="text-2xl font-semibold">Suas Lojas ({stores.length})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {stores.map((store, index) => (
                      <StoreCard key={store.id} store={store} index={index} />
                    ))}
                  </div>
                </>
              ) : (
                <Card className="max-w-md mx-auto">
                <CardContent className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-6">
                    <Store className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nenhuma loja encontrada</h3>
                  <p className="text-muted-foreground mb-6">
                    Ainda não há lojas configuradas em sua conta. Entre em contato com nosso suporte.
                  </p>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Entrar em contato
                  </Button>
                </CardContent>
              </Card>
              )}
            </div>
          </div>

          {/* Help Section */}
          {stores.length > 0 && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <Card className="max-w-2xl mx-auto bg-muted/30">
              <CardContent className="text-center py-8">
                <HelpCircle className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Precisa de ajuda?</h3>
                <p className="text-muted-foreground mb-6">
                  Nossa equipe está pronta para ajudar você a otimizar suas operações
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline">
                    Central de Ajuda
                  </Button>
                  <Button>
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