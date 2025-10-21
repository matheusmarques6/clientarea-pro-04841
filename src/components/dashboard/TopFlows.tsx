import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrendingUp, Zap, Repeat, BarChart3, Users } from "lucide-react";

interface Flow {
  id: string;
  name: string;
  revenue: number;
  conversions: number;
  trigger_type?: string;
  status?: string;
}

interface TopFlowsProps {
  flowsByRevenue: Flow[];
  flowsByPerformance: Flow[];
  currency?: string;
}

export const TopFlows = ({ flowsByRevenue, flowsByPerformance, currency = "BRL" }: TopFlowsProps) => {
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const getRevenue = (flow: Flow) => flow.revenue || 0;
  const getConversions = (flow: Flow) => flow.conversions || 0;
  const getName = (flow: Flow) => flow.name || 'Flow sem nome';
  const getTriggerType = (flow: Flow) => flow.trigger_type || 'Trigger não especificado';
  const getStatus = (flow: Flow) => flow.status || 'N/A';

  const topByRevenue = flowsByRevenue.slice(0, 5);
  const topByPerformance = flowsByPerformance.slice(0, 5);

  const FlowItem = ({ flow, showRevenue = true }: { flow: Flow; showRevenue?: boolean }) => (
    <button
      onClick={() => setSelectedFlow(flow)}
      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-accent hover:border-primary transition-colors cursor-pointer text-left"
    >
      <div className="flex-1">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Repeat className="h-4 w-4 text-purple-600" />
          {getName(flow)}
        </h4>
        <p className="text-xs text-muted-foreground">
          {getTriggerType(flow)}
        </p>
      </div>
      <div className="text-right">
        {showRevenue ? (
          <>
            <p className="font-semibold text-sm">{formatCurrency(getRevenue(flow))}</p>
            <p className="text-xs text-muted-foreground">{getConversions(flow)} conversões</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-sm">{getConversions(flow)} conversões</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(getRevenue(flow))}</p>
          </>
        )}
      </div>
      <Badge variant={getStatus(flow) === 'Live' ? 'default' : 'secondary'} className="ml-2 text-xs">
        {getStatus(flow)}
      </Badge>
    </button>
  );

  if (!flowsByRevenue.length && !flowsByPerformance.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Top Flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Dados do Klaviyo não disponíveis.<br />
            Configure a integração para ver os flows.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Top Flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="revenue" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Por Receita
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Por Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-3 mt-4">
              {topByRevenue.map((flow) => (
                <FlowItem key={flow.id} flow={flow} showRevenue />
              ))}
            </TabsContent>

            <TabsContent value="performance" className="space-y-3 mt-4">
              {topByPerformance.map((flow) => (
                <FlowItem key={flow.id} flow={flow} showRevenue={false} />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Flow Details Dialog */}
      <Dialog open={!!selectedFlow} onOpenChange={(open) => !open && setSelectedFlow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Detalhes do Flow
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre o desempenho deste flow automatizado
            </DialogDescription>
          </DialogHeader>

          {selectedFlow && (
            <div className="space-y-6">
              {/* Flow Name */}
              <div>
                <h3 className="text-lg font-semibold mb-1">{getName(selectedFlow)}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    {getTriggerType(selectedFlow)}
                  </Badge>
                  <Badge variant={getStatus(selectedFlow) === 'Live' ? 'default' : 'secondary'}>
                    {getStatus(selectedFlow)}
                  </Badge>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Receita Gerada
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="text-2xl font-bold">
                        {formatCurrency(getRevenue(selectedFlow))}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Conversões
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="text-2xl font-bold">
                        {getConversions(selectedFlow)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Receita por Conversão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      <span className="text-2xl font-bold">
                        {getConversions(selectedFlow) > 0
                          ? formatCurrency(getRevenue(selectedFlow) / getConversions(selectedFlow))
                          : formatCurrency(0)
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      ID do Flow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {selectedFlow.id}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Info */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>Tipo:</strong> Flow automatizado que é acionado por "{getTriggerType(selectedFlow)}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Flows são emails automatizados que são enviados com base em gatilhos específicos, como carrinhos abandonados, novos cadastros, compras, etc.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
