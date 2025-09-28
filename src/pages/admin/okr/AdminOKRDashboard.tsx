import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Target, TrendingUp, AlertCircle, Award, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOKRData } from '@/hooks/useOKRData';

export const AdminOKRDashboard = () => {
  const navigate = useNavigate();
  const { periods, currentPeriod, scores, metrics, loading } = useOKRData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sistema OKR</h1>
          <p className="text-muted-foreground">Gestão de objetivos e resultados-chave</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/okr/periods')}>
            <Calendar className="mr-2 h-4 w-4" />
            Períodos
          </Button>
          <Button onClick={() => navigate('/admin/okr/team')} variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Equipe
          </Button>
        </div>
      </div>

      {/* Período Atual */}
      {currentPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Período Atual: {currentPeriod.name}</span>
              <Badge variant="secondary">
                {new Date(currentPeriod.start_date).toLocaleDateString('pt-BR')} - 
                {new Date(currentPeriod.end_date).toLocaleDateString('pt-BR')}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgScore || 0}%</div>
            <Progress value={metrics?.avgScore || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Com OKRs definidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalObjectives || 0}</div>
            <p className="text-xs text-muted-foreground">Total no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bônus Total</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(metrics?.totalBonus || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Estimado no período</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Visualização */}
      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="objectives">Objetivos</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="flags">Flags</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scores?.map((score: any) => (
                  <div key={score.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold">{score.profile?.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{score.profile?.name}</p>
                        <p className="text-sm text-muted-foreground">{score.profile?.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{score.score_pct}%</p>
                        <p className="text-sm text-muted-foreground">Score</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/admin/okr/profile/${score.profile_id}`)}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objectives">
          <Card>
            <CardHeader>
              <CardTitle>Objetivos do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/admin/okr/objectives')}
                className="w-full"
              >
                Gerenciar Objetivos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Lançamento de Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/admin/okr/metrics')}
                className="w-full"
              >
                Lançar Métricas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags">
          <Card>
            <CardHeader>
              <CardTitle>Flags de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics?.recentFlags?.map((flag: any) => (
                  <div key={flag.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`h-4 w-4 ${flag.level === 'red' ? 'text-red-500' : 'text-yellow-500'}`} />
                      <span className="text-sm">{flag.reason}</span>
                    </div>
                    <Badge variant={flag.level === 'red' ? 'destructive' : 'secondary'}>
                      {flag.level}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};