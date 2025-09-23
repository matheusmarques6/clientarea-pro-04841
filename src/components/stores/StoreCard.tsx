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
      className="group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 animate-fade-in backdrop-blur-sm"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="pb-6 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <Store className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className={`absolute -top-1 -right-1 w-5 h-5 ${getStatusColor(store.status || 'disconnected')} rounded-full border-3 border-background shadow-sm animate-pulse`} />
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
        
        <Badge variant={getStatusVariant(store.status || 'disconnected')} className="w-fit shadow-sm border-0 px-3 py-1">
          {getStatusText(store.status || 'disconnected')}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Status Info */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border border-border/30">
          <span className="text-sm font-semibold text-muted-foreground">Status</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(store.status || 'disconnected')}
            <span className="text-sm font-semibold">
              {store.status === 'connected' ? 'Online' : 
               store.status === 'pending' ? 'Aguardando' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button asChild className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 group">
            <Link to={`/store/${store.id}`} className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Acessar Dashboard</span>
            </Link>
          </Button>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2">
            <Button asChild size="sm" variant="outline" className="group/card hover-scale border-border/40 hover:border-blue-300/60 hover:bg-blue-50/80 transition-all duration-300 shadow-sm hover:shadow-md bg-white/50 backdrop-blur-sm">
              <Link to={`/store/${store.id}/returns`} className="flex items-center sm:flex-col justify-start sm:justify-center gap-3 sm:gap-2 h-12 sm:h-20 p-3 sm:p-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/25 flex items-center justify-center border border-blue-200/40 group-hover/card:border-blue-300/60 transition-colors flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 group-hover/card:text-blue-700 transition-colors" />
                </div>
                <div className="flex flex-col sm:items-center">
                  <span className="text-sm sm:text-xs font-semibold text-blue-700 group-hover/card:text-blue-800 transition-colors">Trocas</span>
                  <span className="text-xs text-blue-600/70 sm:hidden">Gerenciar trocas</span>
                </div>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="group/card hover-scale border-border/40 hover:border-green-300/60 hover:bg-green-50/80 transition-all duration-300 shadow-sm hover:shadow-md bg-white/50 backdrop-blur-sm">
              <Link to={`/store/${store.id}/refunds`} className="flex items-center sm:flex-col justify-start sm:justify-center gap-3 sm:gap-2 h-12 sm:h-20 p-3 sm:p-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500/15 to-green-600/25 flex items-center justify-center border border-green-200/40 group-hover/card:border-green-300/60 transition-colors flex-shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 group-hover/card:text-green-700 transition-colors" />
                </div>
                <div className="flex flex-col sm:items-center">
                  <span className="text-sm sm:text-xs font-semibold text-green-700 group-hover/card:text-green-800 transition-colors">Reembolsos</span>
                  <span className="text-xs text-green-600/70 sm:hidden">Processar reembolsos</span>
                </div>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="group/card hover-scale border-border/40 hover:border-purple-300/60 hover:bg-purple-50/80 transition-all duration-300 shadow-sm hover:shadow-md bg-white/50 backdrop-blur-sm">
              <Link to={`/store/${store.id}/costs`} className="flex items-center sm:flex-col justify-start sm:justify-center gap-3 sm:gap-2 h-12 sm:h-20 p-3 sm:p-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-600/25 flex items-center justify-center border border-purple-200/40 group-hover/card:border-purple-300/60 transition-colors flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 group-hover/card:text-purple-700 transition-colors" />
                </div>
                <div className="flex flex-col sm:items-center">
                  <span className="text-sm sm:text-xs font-semibold text-purple-700 group-hover/card:text-purple-800 transition-colors">Custos</span>
                  <span className="text-xs text-purple-600/70 sm:hidden">Analisar custos</span>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StoreCard;