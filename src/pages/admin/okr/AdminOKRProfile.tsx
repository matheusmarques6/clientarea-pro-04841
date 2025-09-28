import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Target, 
  TrendingUp, 
  Award, 
  AlertCircle, 
  Calendar,
  BarChart,
  ChevronLeft,
  Calculator
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOKRData } from '@/hooks/useOKRData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminOKRProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentPeriod, calculateScore, checkFlags } = useOKRData();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [score, setScore] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadProfileData();
    }
  }, [id, currentPeriod]);

  const loadProfileData = async () => {
    if (!currentPeriod) return;
    
    try {
      setLoading(true);

      // Carregar dados do colaborador
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      setProfile(userData);

      // Carregar objetivos e KRs
      const { data: objectivesData } = await supabase
        .from('okr_objectives')
        .select(`
          *,
          key_results:okr_key_results(*)
        `)
        .eq('profile_id', id)
        .eq('period_id', currentPeriod.id);

      setObjectives(objectivesData || []);

      // Carregar métricas
      const { data: metricsData } = await supabase
        .from('okr_monthly_metrics')
        .select(`
          *,
          store:stores(name)
        `)
        .eq('profile_id', id)
        .eq('period_id', currentPeriod.id)
        .order('month', { ascending: false });

      setMetrics(metricsData || []);

      // Carregar score
      const { data: scoreData } = await supabase
        .from('okr_period_scores')
        .select('*')
        .eq('profile_id', id)
        .eq('period_id', currentPeriod.id)
        .single();

      setScore(scoreData);

      // Carregar flags
      const { data: flagsData } = await supabase
        .from('okr_performance_flags')
        .select('*')
        .eq('profile_id', id)
        .eq('period_id', currentPeriod.id)
        .order('occurred_on', { ascending: false });

      setFlags(flagsData || []);

    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateScore = async () => {
    if (!id || !currentPeriod) return;
    
    try {
      const result = await calculateScore(id, currentPeriod.id);
      await checkFlags(id, currentPeriod.id);
      await loadProfileData();
      
      toast({
        title: 'Score calculado',
        description: `Score: ${(result as any)?.score_pct}% | Bônus: R$ ${(result as any)?.bonus_value}`
      });
    } catch (error) {
      toast({
        title: 'Erro ao calcular score',
        variant: 'destructive'
      });
    }
  };

  const calculateKRProgress = (kr: any) => {
    if (!kr.target) return 0;
    if (kr.direction === 'up') {
      return Math.min((kr.current_value / kr.target) * 100, kr.allow_over ? 120 : 100);
    } else {
      return Math.min((kr.target / kr.current_value) * 100, kr.allow_over ? 120 : 100);
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'lider': return 'bg-purple-100 text-purple-800';
      case 'senior': return 'bg-blue-100 text-blue-800';
      case 'pleno': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!profile) {
    return <div>Colaborador não encontrado</div>;
  }

  const baseSalary = profile.base_salary || 0;
  const variablePct = profile.variable_pct || 0.30;
  const maxBonus = baseSalary * variablePct;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/okr')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      {/* Informações do Colaborador */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{profile.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getLevelBadgeColor(profile.level)}>
                    {profile.level}
                  </Badge>
                  <Badge variant="outline">{profile.role}</Badge>
                  {profile.department && (
                    <Badge variant="secondary">{profile.department}</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={handleCalculateScore}>
              <Calculator className="h-4 w-4 mr-2" />
              Recalcular Score
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Salário Base</p>
              <p className="text-xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(baseSalary)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Variável</p>
              <p className="text-xl font-bold">{(variablePct * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">
                Máx: {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(maxBonus)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Score Atual</p>
              <p className="text-xl font-bold text-primary">
                {score?.score_pct || 0}%
              </p>
              <Progress value={score?.score_pct || 0} className="mt-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bônus Estimado</p>
              <p className="text-xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(score?.bonus_value || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flags de Performance */}
      {flags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Flags de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {flags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <AlertCircle 
                      className={`h-4 w-4 ${
                        flag.level === 'red' ? 'text-red-500' : 'text-yellow-500'
                      }`} 
                    />
                    <span className="text-sm">{flag.reason}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(flag.occurred_on), 'dd/MM/yyyy')}
                    </span>
                    <Badge variant={flag.level === 'red' ? 'destructive' : 'secondary'}>
                      {flag.level}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs com detalhes */}
      <Tabs defaultValue="objectives" className="space-y-4">
        <TabsList>
          <TabsTrigger value="objectives">Objetivos & KRs</TabsTrigger>
          <TabsTrigger value="metrics">Métricas Mensais</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="objectives" className="space-y-4">
          {objectives.map((objective) => (
            <Card key={objective.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{objective.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Peso: {objective.weight_pct}%
                    </p>
                  </div>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {objective.key_results?.map((kr: any) => (
                    <div key={kr.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{kr.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              className={
                                kr.status === 'on_track' ? 'bg-green-100 text-green-800' :
                                kr.status === 'at_risk' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              {kr.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Peso: {kr.weight_pct}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {kr.current_value} / {kr.target} {kr.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {kr.direction === 'up' ? 'Maior é melhor' : 'Menor é melhor'}
                          </p>
                        </div>
                      </div>
                      <Progress value={calculateKRProgress(kr)} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas Mensais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">
                          {format(new Date(metric.month), 'MMMM/yyyy', { locale: ptBR })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {metric.store?.name || 'Todas as lojas'}
                        </p>
                      </div>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Resultado Convertfy</p>
                        <p className="font-medium">{metric.resultado_convertfy_pct}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Campanhas</p>
                        <p className="font-medium">{metric.campanhas_enviadas}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Automações</p>
                        <p className="font-medium">{metric.automacoes_ativas}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">NPS</p>
                        <p className="font-medium">{metric.nps || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Churn</p>
                        <p className="font-medium">{metric.churn_pct}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Atrasos</p>
                        <p className="font-medium">{metric.onboarding_atrasos_pct}%</p>
                      </div>
                    </div>
                    
                    {metric.notes && (
                      <p className="text-sm text-muted-foreground mt-3">
                        📝 {metric.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidade em desenvolvimento...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};