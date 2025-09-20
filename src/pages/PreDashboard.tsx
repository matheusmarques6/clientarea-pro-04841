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
    <section 
      id="pre-dashboard" 
      className="center-screen bg-gradient-to-br from-background via-background to-muted/50"
    >
      <div className="pre-dashboard-inner">
        <div className="flex flex-col items-center justify-center gap-6 w-full">
          
          {/* Header Section - Responsivo */}
          <header className="w-full max-w-6xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6">
              {/* Logo */}
              <div className="flex-shrink-0 order-2 lg:order-1">
                <img 
                  src={convertfyLogo} 
                  alt="Convertfy" 
                  className="h-8 sm:h-10 lg:h-12 w-auto"
                />
              </div>
              
              {/* Central Content */}
              <div className="flex-1 text-center order-1 lg:order-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  Olá, <span className="text-premium">João</span>
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Bem-vindo de volta à sua central Convertfy
                </p>
              </div>
              
              {/* Status Badge */}
              <div className="flex-shrink-0 order-3">
                <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                  Sincronizado há 5 min
                </Badge>
              </div>
            </div>
          </header>

          {/* Main KPI Card - Responsivo */}
          <Card className="w-full max-w-4xl glass-card">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-4 lg:gap-8">
                
                {/* Period Selector */}
                <div className="text-center lg:text-left">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3">
                    Seu faturamento dos{' '}
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="inline-flex w-auto h-auto p-0 border-none bg-transparent text-base sm:text-lg lg:text-xl font-semibold focus:ring-2 focus:ring-primary/20 rounded">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="7d">últimos 7 dias</SelectItem>
                        <SelectItem value="30d">últimos 30 dias</SelectItem>
                        <SelectItem value="90d">últimos 90 dias</SelectItem>
                        <SelectItem value="MTD">mês atual</SelectItem>
                        <SelectItem value="YTD">ano atual</SelectItem>
                      </SelectContent>
                    </Select>
                  </h2>
                </div>
                
                {/* Revenue Display */}
                <div className="text-center lg:text-right">
                  <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-premium leading-none mb-3">
                    R$ {currentData.revenue.toLocaleString('pt-BR')}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="bg-green-100 text-green-700 hover:bg-green-100 px-3 py-1"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{currentData.growth}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Channel Revenue Cards - Mesma largura do Hero Card */}
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {mockChannelRevenue.map((channel, index) => {
                const icons = [Mail, MessageCircle, Smartphone];
                const Icon = icons[index];
                const colors = [
                  'bg-blue-50 text-blue-600',
                  'bg-green-50 text-green-600', 
                  'bg-purple-50 text-purple-600'
                ];

                return (
                  <Card 
                    key={channel.channel} 
                    className="glass-card animate-hover transition-all duration-200 ease-smooth h-full"
                  >
                    <CardContent className="p-4 sm:p-6 h-full min-h-[140px] flex flex-col justify-between w-full">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        
                        {/* Icon */}
                        <div className={`p-2 sm:p-3 rounded-lg ${colors[index]} flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center`}>
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">
                              {channel.channel}
                            </p>
                            <p className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                              R$ {channel.revenue.toLocaleString('pt-BR')}
                            </p>
                          </div>
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

          {/* CTA Button - Responsivo */}
          <div className="w-full max-w-lg mt-4">
            <Button 
              asChild 
              size="lg" 
              className="w-full bg-gradient-hero hover:opacity-90 text-base sm:text-lg h-12 sm:h-14 rounded-xl transition-all duration-200 ease-smooth focus:ring-2 focus:ring-primary/20"
            >
              <Link to="/stores" className="font-semibold">
                Ver minhas lojas
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
};

export default PreDashboard;