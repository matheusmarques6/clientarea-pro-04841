import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Store, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold heading-primary">Suas Lojas</h1>
            <p className="text-muted-foreground">
              Selecione uma loja para acessar o dashboard
            </p>
          </div>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.length > 0 ? stores.map((store) => (
            <Card key={store.id} className="glass-card animate-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{store.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {store.country || 'Não informado'} • {store.currency || 'BRL'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(store.status || 'disconnected')}>
                    {getStatusText(store.status || 'disconnected')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">País</span>
                    <span>{store.country || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Moeda</span>
                    <span>{store.currency || 'BRL'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button asChild size="sm" variant="default">
                    <Link to={`/store/${store.id}`}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/store/${store.id}/returns`}>
                      Trocas
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/store/${store.id}/refunds`}>
                      Reembolsos
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/store/${store.id}/costs`}>
                      Custos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-full text-center py-12">
              <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhuma loja encontrada</p>
              <p className="text-sm text-muted-foreground mt-2">
                Entre em contato com o suporte para configurar suas lojas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreSelector;