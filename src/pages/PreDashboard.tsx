import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { mockChannelRevenue } from '@/lib/mockData';
import convertfyLogo from '@/assets/convertfy-logo.png';

const PreDashboard = () => {
  const [period, setPeriod] = useState('30d');
  
  const periodData = {
    '7d': { revenue: 4200, growth: 8.5, label: 'últimos 7 dias' },
    '30d': { revenue: 16400, growth: 12.8, label: 'últimos 30 dias' },
    '90d': { revenue: 45200, growth: 18.2, label: 'últimos 90 dias' },
    'MTD': { revenue: 12800, growth: 15.1, label: 'mês atual' },
    'YTD': { revenue: 124500, growth: 22.3, label: 'ano atual' }
  };

  const currentData = periodData[period as keyof typeof periodData];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={convertfyLogo} 
              alt="Convertfy" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Olá, <span className="text-premium">João</span>
              </h1>
              <p className="text-muted-foreground">
                Bem-vindo de volta à sua central Convertfy
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            Sincronizado há 5 min
          </Badge>
        </div>

        {/* Hero Card */}
        <Card className="glass-card p-8">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold mb-2">
                  Seu faturamento dos{' '}
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="inline-flex w-auto h-auto p-0 border-none bg-transparent text-xl font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">últimos 7 dias</SelectItem>
                      <SelectItem value="30d">últimos 30 dias</SelectItem>
                      <SelectItem value="90d">últimos 90 dias</SelectItem>
                      <SelectItem value="MTD">mês atual</SelectItem>
                      <SelectItem value="YTD">ano atual</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-premium mb-2">
                  R$ {currentData.revenue.toLocaleString('pt-BR')}
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-green-100 text-green-700 hover:bg-green-100"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{currentData.growth}%
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockChannelRevenue.map((channel, index) => {
            const icons = [Mail, MessageCircle, Smartphone];
            const Icon = icons[index];
            const colors = [
              'bg-blue-50 text-blue-600',
              'bg-green-50 text-green-600', 
              'bg-purple-50 text-purple-600'
            ];

            return (
              <Card key={channel.channel} className="glass-card animate-hover">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${colors[index]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{channel.channel}</p>
                      <p className="text-2xl font-bold">
                        R$ {channel.revenue.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {channel.percentage}% do total
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button 
            asChild 
            size="lg" 
            className="bg-gradient-hero hover:opacity-90 text-lg px-8 py-6 h-auto"
          >
            <Link to="/stores">
              Ver minhas lojas
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreDashboard;