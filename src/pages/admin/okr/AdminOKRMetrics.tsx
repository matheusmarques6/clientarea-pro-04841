import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, TrendingUp, BarChart } from 'lucide-react';
import { useOKRMetrics } from '@/hooks/useOKRMetrics';
import { useOKRData } from '@/hooks/useOKRData';
import { useOKRTeam } from '@/hooks/useOKRTeam';
import { useStores } from '@/hooks/useStores';
import { useToast } from '@/hooks/use-toast';

export const AdminOKRMetrics = () => {
  const { metrics, loading, addMetric, updateMetric } = useOKRMetrics();
  const { currentPeriod } = useOKRData();
  const { team } = useOKRTeam();
  const { stores } = useStores();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    profile_id: '',
    store_id: '',
    month: new Date(),
    resultado_convertfy_pct: 0,
    campanhas_enviadas: 0,
    automacoes_ativas: 0,
    nps: 0,
    churn_pct: 0,
    onboarding_atrasos_pct: 0,
    templates_padronizados: 0,
    tempo_medio_entrega_dias: 0,
    frameworks_validados: 0,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        period_id: currentPeriod?.id,
        month: format(formData.month, 'yyyy-MM-01')
      };
      
      await addMetric(data);
      
      toast({
        title: 'Sucesso',
        description: 'Métrica lançada com sucesso'
      });
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao lançar métrica',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      profile_id: '',
      store_id: '',
      month: new Date(),
      resultado_convertfy_pct: 0,
      campanhas_enviadas: 0,
      automacoes_ativas: 0,
      nps: 0,
      churn_pct: 0,
      onboarding_atrasos_pct: 0,
      templates_padronizados: 0,
      tempo_medio_entrega_dias: 0,
      frameworks_validados: 0,
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lançamento de Métricas</h1>
          <p className="text-muted-foreground">Período: {currentPeriod?.name || 'Nenhum período ativo'}</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Lançar Métrica
        </Button>
      </div>

      {/* Métricas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Lançadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Resultado (%)</TableHead>
                <TableHead>Campanhas</TableHead>
                <TableHead>Automações</TableHead>
                <TableHead>NPS</TableHead>
                <TableHead>Churn (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.map((metric: any) => {
                const user = team.find(t => t.id === metric.profile_id);
                const store = stores.find(s => s.id === metric.store_id);
                
                return (
                  <TableRow key={metric.id}>
                    <TableCell>
                      {format(new Date(metric.month), 'MMM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{user?.name || '-'}</TableCell>
                    <TableCell>{store?.name || '-'}</TableCell>
                    <TableCell>{metric.resultado_convertfy_pct}%</TableCell>
                    <TableCell>{metric.campanhas_enviadas}</TableCell>
                    <TableCell>{metric.automacoes_ativas}</TableCell>
                    <TableCell>{metric.nps || '-'}</TableCell>
                    <TableCell>{metric.churn_pct}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Lançamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançar Métricas</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Mês</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.month && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.month ? format(formData.month, 'MMMM/yyyy', { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.month}
                      onSelect={(date) => date && setFormData({ ...formData, month: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>Colaborador</Label>
                <Select
                  value={formData.profile_id}
                  onValueChange={(value) => setFormData({ ...formData, profile_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Loja</Label>
                <Select
                  value={formData.store_id}
                  onValueChange={(value) => setFormData({ ...formData, store_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Métricas de Performance</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Resultado Convertfy (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.resultado_convertfy_pct}
                    onChange={(e) => setFormData({ ...formData, resultado_convertfy_pct: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Campanhas Enviadas</Label>
                  <Input
                    type="number"
                    value={formData.campanhas_enviadas}
                    onChange={(e) => setFormData({ ...formData, campanhas_enviadas: parseInt(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Automações Ativas</Label>
                  <Input
                    type="number"
                    value={formData.automacoes_ativas}
                    onChange={(e) => setFormData({ ...formData, automacoes_ativas: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>NPS</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.nps}
                    onChange={(e) => setFormData({ ...formData, nps: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Churn (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.churn_pct}
                    onChange={(e) => setFormData({ ...formData, churn_pct: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Atrasos Onboarding (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.onboarding_atrasos_pct}
                    onChange={(e) => setFormData({ ...formData, onboarding_atrasos_pct: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Templates Padronizados</Label>
                  <Input
                    type="number"
                    value={formData.templates_padronizados}
                    onChange={(e) => setFormData({ ...formData, templates_padronizados: parseInt(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Tempo Médio Entrega (dias)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.tempo_medio_entrega_dias}
                    onChange={(e) => setFormData({ ...formData, tempo_medio_entrega_dias: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label>Frameworks Validados</Label>
                  <Input
                    type="number"
                    value={formData.frameworks_validados}
                    onChange={(e) => setFormData({ ...formData, frameworks_validados: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Lançar Métrica
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};