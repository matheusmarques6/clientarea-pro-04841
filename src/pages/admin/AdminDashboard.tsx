import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Store, 
  TrendingUp, 
  Plus,
  FileText,
  Calendar,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AdminDashboardStats } from '@/types/admin';

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalClients: 0,
    activeStores: 0,
    activeUsers: 0,
    openRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const [clientsRes, storesRes, usersRes, returnsRes, refundsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('stores').select('id', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('returns').select('id', { count: 'exact' }).in('status', ['new', 'review']),
        supabase.from('refunds').select('id', { count: 'exact' }).in('status', ['requested', 'review'])
      ]);

      setStats({
        totalClients: clientsRes.count || 0,
        activeStores: storesRes.count || 0,
        activeUsers: usersRes.count || 0,
        openRequests: (returnsRes.count || 0) + (refundsRes.count || 0),
      });

      // Fetch recent activity from audit log
      const { data: auditData } = await supabase
        .from('admin_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(auditData || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total de Clientes',
      value: stats.totalClients,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/clients'
    },
    {
      title: 'Lojas Ativas',
      value: stats.activeStores,
      icon: Store,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/admin/stores'
    },
    {
      title: 'Usuários Ativos',
      value: stats.activeUsers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/admin/users'
    },
    {
      title: 'Solicitações Abertas',
      value: stats.openRequests,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/audit'
    },
  ];

  const quickActions = [
    {
      title: 'Criar Cliente',
      description: 'Adicionar novo cliente ao sistema',
      icon: Building2,
      href: '/admin/clients/new',
      color: 'bg-blue-500'
    },
    {
      title: 'Criar Usuário',
      description: 'Adicionar novo usuário',
      icon: Users,
      href: '/admin/users/new',
      color: 'bg-green-500'
    },
    {
      title: 'Criar Loja',
      description: 'Adicionar nova loja',
      icon: Store,
      href: '/admin/stores/new',
      color: 'bg-purple-500'
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold heading-primary">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema Convertfy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Activity className="w-3 h-3 mr-1" />
            Sistema Online
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="glass-card animate-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>
                Atalhos para tarefas comuns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Link key={action.title} to={action.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-lg ${action.color} text-white`}>
                      <action.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Atividade Recente
              </CardTitle>
              <CardDescription>
                Últimas ações administrativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="p-2 rounded-full bg-primary/10">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.entity} • {new Date(activity.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma atividade recente</p>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t">
                <Link to="/admin/audit">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Todas as Atividades
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;