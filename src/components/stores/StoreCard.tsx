import { Link } from 'react-router-dom';
import { Store, BarChart3, TrendingUp, DollarSign, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StoreCardProps {
  store: {
    id: string;
    name: string;
    country?: string;
    currency?: string;
    status?: string;
  };
  index: number;
}

const StoreCard = ({ store, index }: StoreCardProps) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  return (
    <Card 
      className="group relative overflow-hidden bg-card border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Store className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className={`absolute -top-1 -right-1 w-4 h-4 ${getStatusColor(store.status || 'disconnected')} rounded-full border-2 border-background`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                {store.name}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>{store.country || 'BR'}</span>
                <span>•</span>
                <span>{store.currency || 'BRL'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <Badge variant={getStatusVariant(store.status || 'disconnected')} className="w-fit">
          {getStatusText(store.status || 'disconnected')}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Status</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(store.status || 'disconnected')}
            <span className="text-sm font-medium">
              {store.status === 'connected' ? 'Online' : 
               store.status === 'pending' ? 'Aguardando' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link to={`/store/${store.id}`} className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Acessar Dashboard
            </Link>
          </Button>
          
          <div className="grid grid-cols-3 gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to={`/store/${store.id}/returns`} className="flex flex-col items-center gap-1 h-16">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Trocas</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={`/store/${store.id}/refunds`} className="flex flex-col items-center gap-1 h-16">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Reembolsos</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={`/store/${store.id}/costs`} className="flex flex-col items-center gap-1 h-16">
                <Package className="h-4 w-4" />
                <span className="text-xs">Custos</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StoreCard;