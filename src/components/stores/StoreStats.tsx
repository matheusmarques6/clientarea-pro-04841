import { Card, CardContent } from '@/components/ui/card';

interface StoreStatsProps {
  stores: Array<{
    status?: string;
  }>;
}

const StoreStats = ({ stores }: StoreStatsProps) => {
  const connectedStores = stores.filter(s => s.status === 'connected').length;
  const pendingStores = stores.filter(s => s.status !== 'connected').length;

  const stats = [
    {
      label: stores.length === 1 ? 'Loja Total' : 'Lojas Totais',
      value: stores.length,
      color: 'text-primary'
    },
    {
      label: 'Conectadas',
      value: connectedStores,
      color: 'text-green-600'
    },
    {
      label: 'Pendentes',
      value: pendingStores,
      color: 'text-yellow-600'
    }
  ];

  return (
    <Card className="bg-card/50 backdrop-blur-sm border">
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StoreStats;