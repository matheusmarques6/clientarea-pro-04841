import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Mail, Package, DollarSign } from 'lucide-react';

interface DetailedKlaviyoMetricsProps {
  rawData: any;
}

export const DetailedKlaviyoMetrics = ({ rawData }: DetailedKlaviyoMetricsProps) => {
  if (!rawData) return null;

  // Extrair dados dos arrays detalhados
  const detailedCampaigns = rawData?.detalhedCampanhas || rawData?.detailed_campaigns || [];
  const detailedFlows = rawData?.detalhedFlows || rawData?.flows_detailed || [];
  const topProducts = rawData?.produtosMaisVendidos || rawData?.top_products || [];
  const campaignPerformance = rawData?.performanceCampanhas || rawData?.campaign_performance || [];

  return (
    <div className="space-y-6">
      {/* Campanhas Detalhadas */}
      {detailedCampaigns.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Campanhas Detalhadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Aberturas</TableHead>
                  <TableHead>Cliques</TableHead>
                  <TableHead>Taxa Abertura</TableHead>
                  <TableHead>Taxa Clique</TableHead>
                  <TableHead>Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedCampaigns.slice(0, 10).map((campaign: any, index: number) => (
                  <TableRow key={campaign.id || index}>
                    <TableCell className="font-medium">{campaign.name || campaign.nome || 'N/A'}</TableCell>
                    <TableCell>{campaign.status || 'Ativo'}</TableCell>
                    <TableCell>{campaign.sent || campaign.enviados || 0}</TableCell>
                    <TableCell>{campaign.opens || campaign.aberturas || 0}</TableCell>
                    <TableCell>{campaign.clicks || campaign.cliques || 0}</TableCell>
                    <TableCell>{campaign.open_rate || campaign.taxa_abertura || '0'}%</TableCell>
                    <TableCell>{campaign.click_rate || campaign.taxa_clique || '0'}%</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(campaign.revenue || campaign.receita || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Fluxos Detalhados */}
      {detailedFlows.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Fluxos de Automação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entregas</TableHead>
                  <TableHead>Taxa Abertura</TableHead>
                  <TableHead>Taxa Clique</TableHead>
                  <TableHead>Conversões</TableHead>
                  <TableHead>Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedFlows.slice(0, 10).map((flow: any, index: number) => (
                  <TableRow key={flow.id || index}>
                    <TableCell className="font-medium">{flow.name || flow.nome || 'N/A'}</TableCell>
                    <TableCell>{flow.status || 'Ativo'}</TableCell>
                    <TableCell>{flow.deliveries || flow.performance?.deliveries || 0}</TableCell>
                    <TableCell>{flow.performance?.open_rate || '0'}%</TableCell>
                    <TableCell>{flow.performance?.click_rate || '0'}%</TableCell>
                    <TableCell>{flow.conversions || 0}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(flow.revenue || flow.receita || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Produtos Mais Vendidos */}
      {topProducts.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Produtos Mais Vendidos (via Email)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.slice(0, 10).map((product: any, index: number) => (
                  <TableRow key={product.id || index}>
                    <TableCell className="font-medium">{product.name || product.nome || 'N/A'}</TableCell>
                    <TableCell>{product.quantity || product.quantidade || 0}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(product.revenue || product.receita || 0)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(product.average_price || product.ticket_medio || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Performance Geral das Campanhas */}
      {campaignPerformance.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Performance Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {campaignPerformance.map((metric: any, index: number) => (
                <div key={index} className="text-center">
                  <p className="text-sm text-muted-foreground">{metric.label || metric.nome}</p>
                  <p className="text-2xl font-bold">{metric.value || metric.valor}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};