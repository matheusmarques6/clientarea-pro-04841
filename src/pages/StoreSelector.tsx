import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogOut, User, HelpCircle, Mail, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStores } from '@/hooks/useStores';
import { useAuth } from '@/hooks/useAuth';
import convertfyLogo from '@/assets/convertfy-logo.png';
import StoreCard from '@/components/stores/StoreCard';
import StoreStats from '@/components/stores/StoreStats';
import StoreLoading from '@/components/stores/StoreLoading';
import AddStoreModal from '@/components/stores/AddStoreModal';
import { HelpModal } from '@/components/support/HelpModal';
import { SupportModal } from '@/components/support/SupportModal';

const StoreSelector = () => {
  const navigate = useNavigate();
  const { stores, loading, refetch } = useStores();
  const { signOut, user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

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
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-lg supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50 shadow-sm">
        <div className="w-full py-4">
          <div className="flex items-center justify-between px-4 md:px-[60px]">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <img src={convertfyLogo} alt="Convertfy" className="h-8 w-auto" />
              <div className="hidden sm:block h-6 w-px bg-border" />
              <h1 className="hidden sm:block text-lg font-semibold text-foreground">Suas Lojas</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/80 border border-border/40">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 hover:bg-muted/80 text-foreground"
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
            <div className="space-y-6 px-4 md:px-[60px]">
              {stores.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Suas Lojas ({stores.length})</h2>
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Adicionar Loja</span>
                      <span className="sm:hidden">Nova</span>
                    </Button>
                  </div>
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
                    Comece adicionando sua primeira loja para acessar o dashboard.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                      size="lg"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Primeira Loja
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-2 hover:bg-muted/50"
                      onClick={() => setShowSupportModal(true)}
                      size="lg"
                    >
                      <Mail className="h-4 w-4" />
                      Entrar em contato
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          </div>

          {/* Help Section */}
          {stores.length > 0 && (
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <Card className="mx-auto max-w-2xl border-border/60 bg-card/80 shadow-lg">
                <CardContent className="rounded-xl border border-border/40 bg-background/60 py-8 text-center">
                  <HelpCircle className="mx-auto mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Precisa de ajuda?</h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Nossa equipe está pronta para ajudar você a otimizar suas operações.
                  </p>
                  <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      className="border-2 bg-background/80 hover:bg-muted/50"
                      onClick={() => setShowHelpModal(true)}
                    >
                      Central de Ajuda
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                      onClick={() => setShowSupportModal(true)}
                    >
                      Falar com Suporte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Add Store Modal */}
      <AddStoreModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Help Modal */}
      <HelpModal
        open={showHelpModal}
        onOpenChange={setShowHelpModal}
        onContactSupport={() => setShowSupportModal(true)}
      />

      {/* Support Modal */}
      <SupportModal
        open={showSupportModal}
        onOpenChange={setShowSupportModal}
      />
    </div>
  );
};

export default StoreSelector;
