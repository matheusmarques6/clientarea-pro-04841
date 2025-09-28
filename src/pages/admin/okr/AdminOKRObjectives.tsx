import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, ChevronDown, ChevronUp, Edit, Trash } from 'lucide-react';
import { useOKRObjectives } from '@/hooks/useOKRObjectives';
import { useOKRData } from '@/hooks/useOKRData';
import { useOKRTeam } from '@/hooks/useOKRTeam';
import { useToast } from '@/hooks/use-toast';

export const AdminOKRObjectives = () => {
  const { objectives, loading, addObjective, updateObjective, deleteObjective, addKeyResult, updateKeyResult, deleteKeyResult } = useOKRObjectives();
  const { currentPeriod } = useOKRData();
  const { team } = useOKRTeam();
  const { toast } = useToast();
  
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [objectiveDialog, setObjectiveDialog] = useState(false);
  const [krDialog, setKrDialog] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [selectedKR, setSelectedKR] = useState<any>(null);
  
  const [objectiveForm, setObjectiveForm] = useState({
    title: '',
    description: '',
    weight_pct: 0,
    profile_id: ''
  });
  
  const [krForm, setKrForm] = useState({
    title: '',
    description: '',
    weight_pct: 0,
    unit: 'percent',
    target: 0,
    direction: 'up',
    allow_over: false,
    current_value: 0
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedObjectives(newExpanded);
  };

  const handleObjectiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...objectiveForm,
        period_id: currentPeriod?.id
      };
      
      if (selectedObjective) {
        await updateObjective(selectedObjective.id, data);
        toast({ title: 'Objetivo atualizado com sucesso' });
      } else {
        await addObjective(data);
        toast({ title: 'Objetivo criado com sucesso' });
      }
      
      setObjectiveDialog(false);
      resetObjectiveForm();
    } catch (error) {
      toast({
        title: 'Erro ao salvar objetivo',
        variant: 'destructive'
      });
    }
  };

  const handleKRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...krForm,
        objective_id: selectedObjective?.id
      };
      
      if (selectedKR) {
        await updateKeyResult(selectedKR.id, data);
        toast({ title: 'Key Result atualizado com sucesso' });
      } else {
        await addKeyResult(data);
        toast({ title: 'Key Result criado com sucesso' });
      }
      
      setKrDialog(false);
      resetKRForm();
    } catch (error) {
      toast({
        title: 'Erro ao salvar Key Result',
        variant: 'destructive'
      });
    }
  };

  const resetObjectiveForm = () => {
    setObjectiveForm({
      title: '',
      description: '',
      weight_pct: 0,
      profile_id: ''
    });
    setSelectedObjective(null);
  };

  const resetKRForm = () => {
    setKrForm({
      title: '',
      description: '',
      weight_pct: 0,
      unit: 'percent',
      target: 0,
      direction: 'up',
      allow_over: false,
      current_value: 0
    });
    setSelectedKR(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'off_track': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (kr: any) => {
    if (!kr.target) return 0;
    if (kr.direction === 'up') {
      return Math.min((kr.current_value / kr.target) * 100, kr.allow_over ? 120 : 100);
    } else {
      return Math.min((kr.target / kr.current_value) * 100, kr.allow_over ? 120 : 100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Objetivos e Key Results</h1>
          <p className="text-muted-foreground">Período: {currentPeriod?.name || 'Nenhum período ativo'}</p>
        </div>
        <Button onClick={() => { resetObjectiveForm(); setObjectiveDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Objetivo
        </Button>
      </div>

      {/* Lista de Objetivos */}
      <div className="space-y-4">
        {objectives.map((objective: any) => {
          const isExpanded = expandedObjectives.has(objective.id);
          const user = team.find(t => t.id === objective.profile_id);
          
          return (
            <Card key={objective.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(objective.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{objective.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {user?.name} • Peso: {objective.weight_pct}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedObjective(objective);
                        setObjectiveForm({
                          title: objective.title,
                          description: objective.description || '',
                          weight_pct: objective.weight_pct,
                          profile_id: objective.profile_id
                        });
                        setObjectiveDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteObjective(objective.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Key Results</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedObjective(objective);
                          resetKRForm();
                          setKrDialog(true);
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Adicionar KR
                      </Button>
                    </div>
                    
                    {objective.key_results?.map((kr: any) => (
                      <div key={kr.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{kr.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getStatusColor(kr.status)}>
                                {kr.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Peso: {kr.weight_pct}% • Meta: {kr.target} {kr.unit}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedObjective(objective);
                                setSelectedKR(kr);
                                setKrForm({
                                  title: kr.title,
                                  description: kr.description || '',
                                  weight_pct: kr.weight_pct,
                                  unit: kr.unit,
                                  target: kr.target,
                                  direction: kr.direction,
                                  allow_over: kr.allow_over,
                                  current_value: kr.current_value
                                });
                                setKrDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteKeyResult(kr.id)}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progresso</span>
                            <span>{kr.current_value} / {kr.target}</span>
                          </div>
                          <Progress value={calculateProgress(kr)} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Dialog Objetivo */}
      <Dialog open={objectiveDialog} onOpenChange={setObjectiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedObjective ? 'Editar Objetivo' : 'Novo Objetivo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleObjectiveSubmit} className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={objectiveForm.title}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={objectiveForm.description}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Colaborador</Label>
              <Select
                value={objectiveForm.profile_id}
                onValueChange={(value) => setObjectiveForm({ ...objectiveForm, profile_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {team.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Peso (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={objectiveForm.weight_pct}
                onChange={(e) => setObjectiveForm({ ...objectiveForm, weight_pct: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setObjectiveDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {selectedObjective ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Key Result */}
      <Dialog open={krDialog} onOpenChange={setKrDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedKR ? 'Editar Key Result' : 'Novo Key Result'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleKRSubmit} className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={krForm.title}
                onChange={(e) => setKrForm({ ...krForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={krForm.description}
                onChange={(e) => setKrForm({ ...krForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unidade</Label>
                <Select
                  value={krForm.unit}
                  onValueChange={(value) => setKrForm({ ...krForm, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                    <SelectItem value="ratio">Razão</SelectItem>
                    <SelectItem value="currency">Moeda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direção</Label>
                <Select
                  value={krForm.direction}
                  onValueChange={(value) => setKrForm({ ...krForm, direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Maior é melhor</SelectItem>
                    <SelectItem value="down">Menor é melhor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Meta</Label>
                <Input
                  type="number"
                  value={krForm.target}
                  onChange={(e) => setKrForm({ ...krForm, target: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Valor Atual</Label>
                <Input
                  type="number"
                  value={krForm.current_value}
                  onChange={(e) => setKrForm({ ...krForm, current_value: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Peso (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={krForm.weight_pct}
                  onChange={(e) => setKrForm({ ...krForm, weight_pct: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allow_over"
                checked={krForm.allow_over}
                onChange={(e) => setKrForm({ ...krForm, allow_over: e.target.checked })}
              />
              <Label htmlFor="allow_over">Permitir score acima de 100%</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setKrDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {selectedKR ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};