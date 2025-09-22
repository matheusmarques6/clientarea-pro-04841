import { Link } from 'react-router-dom';
import { ArrowLeft, Store, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockStores } from '@/lib/mockData';

const StoreSelector = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectada';
      case 'disconnected':
        return 'Desconectada';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'disconnected':
        return 'bg-red-100 text-red-700 hover:bg-red-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold heading-primary">Suas Lojas</h1>
            <p className="text-subtle">
              Selecione uma loja para acessar o dashboard
            </p>
          </div>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockStores.map((store) => (
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
                        {store.country} • {store.currency}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(store.integrationStatus)}>
                    {getStatusIcon(store.integrationStatus)}
                    <span className="ml-1">{getStatusText(store.integrationStatus)}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {store.description && (
                  <p className="text-sm text-muted-foreground">
                    {store.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Receita 30d:</span>
                  <span className="font-semibold">
                    {store.currency === 'BRL' && 'R$ '}
                    {store.currency === 'USD' && '$ '}
                    {store.currency === 'EUR' && '€ '}
                    {store.currency === 'GBP' && '£ '}
                    {store.revenue30d.toLocaleString()}
                  </span>
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoreSelector;