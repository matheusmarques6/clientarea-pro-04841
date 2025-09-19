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
    <div className="min-h-[100dvh] flex items-center justify-center">
      <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {/* Header */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img 
                src={convertfyLogo} 
                alt="Convertfy" 
                className="h-10 sm:h-12 w-auto"
              />
            </div>
            
            {/* Central Content */}
            <div className="flex-1 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Olá, <span className="text-premium">João</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Bem-vindo de volta à sua central Convertfy
              </p>
            </div>
            
            {/* Badge */}
            <div className="flex-shrink-0">
              <Badge variant="secondary" className="px-3 py-1 text-xs sm:text-sm">
                Sincronizado há 5 min
              </Badge>
            </div>
          </div>

          {/* Hero Card */}
          <Card className="w-full max-w-[960px] mx-auto glass-card min-h-[140px] sm:min-h-[160px]">
            <CardContent className="p-4 sm:p-6 lg:p-7">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                    Seu faturamento dos{' '}
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="inline-flex w-auto h-auto p-0 border-none bg-transparent text-lg sm:text-xl font-semibold focus:ring-2 focus:ring-primary/20 rounded">
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
                  </h2>
                </div>
                <div className="text-center lg:text-right">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-premium leading-none mb-2 lg:mb-3">
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
            </CardContent>
          </Card>

          {/* Channel Cards */}
          <div className="w-full max-w-[1120px] mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {mockChannelRevenue.map((channel, index) => {
                const icons = [Mail, MessageCircle, Smartphone];
                const Icon = icons[index];
                const colors = [
                  'bg-blue-50 text-blue-600',
                  'bg-green-50 text-green-600', 
                  'bg-purple-50 text-purple-600'
                ];

                return (
                  <Card key={channel.channel} className="glass-card animate-hover min-h-[120px] sm:min-h-[128px] transition-all duration-200 ease-smooth">
                    <CardContent className="p-4 sm:p-6 h-full">
                      <div className="flex items-start gap-3 sm:gap-4 h-full">
                        <div className={`p-2 sm:p-3 rounded-lg ${colors[index]} flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center`}>
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">{channel.channel}</p>
                          <p className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                            R$ {channel.revenue.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {channel.percentage}% do total
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center mt-6 sm:mt-8 w-full">
            <Button 
              asChild 
              size="lg" 
              className="bg-gradient-hero hover:opacity-90 text-base sm:text-lg min-w-[240px] sm:min-w-[260px] h-[48px] sm:h-[52px] rounded-xl transition-all duration-200 ease-smooth focus:ring-2 focus:ring-primary/20 w-full sm:w-auto max-w-[320px] sm:max-w-none"
            >
              <Link to="/stores">
                Ver minhas lojas
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreDashboard;