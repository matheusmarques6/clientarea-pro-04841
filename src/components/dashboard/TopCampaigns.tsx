import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users } from "lucide-react";
import { Campaign } from "@/api/klaviyo";

interface TopCampaignsProps {
  campaignsByRevenue: Campaign[];
  campaignsByConversions: Campaign[];
  currency?: string;
}

export const TopCampaigns = ({ campaignsByRevenue, campaignsByConversions, currency = "BRL" }: TopCampaignsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não informada';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getRevenue = (campaign: Campaign) => campaign.revenue || 0;
  const getConversions = (campaign: Campaign) => campaign.conversions || 0;
  const getName = (campaign: Campaign) => campaign.name || 'Campanha sem nome';
  const getDate = (campaign: Campaign) => campaign.send_time || '';

  const topByRevenue = campaignsByRevenue.slice(0, 5);
  const topByConversions = campaignsByConversions.slice(0, 5);

  const CampaignItem = ({ campaign, showRevenue = true }: { campaign: Campaign; showRevenue?: boolean }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-sm">{getName(campaign)}</h4>
        <p className="text-xs text-muted-foreground">
          Enviado em {formatDate(getDate(campaign))}
        </p>
      </div>
      <div className="text-right">
        {showRevenue ? (
          <>
            <p className="font-semibold text-sm">{formatCurrency(getRevenue(campaign))}</p>
            <p className="text-xs text-muted-foreground">{getConversions(campaign)} conversões</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-sm">{getConversions(campaign)} conversões</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(getRevenue(campaign))}</p>
          </>
        )}
      </div>
      <Badge variant={campaign.status === 'Sent' ? 'default' : 'secondary'} className="ml-2 text-xs">
        {campaign.status || 'N/A'}
      </Badge>
    </div>
  );

  if (!campaignsByRevenue.length && !campaignsByConversions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Dados do Klaviyo não disponíveis.<br />
            Configure a integração para ver as campanhas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Campanhas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Por Receita
            </TabsTrigger>
            <TabsTrigger value="conversions" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Por Conversões
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="revenue" className="space-y-3 mt-4">
            {topByRevenue.map((campaign) => (
              <CampaignItem key={campaign.id} campaign={campaign} showRevenue />
            ))}
          </TabsContent>
          
          <TabsContent value="conversions" className="space-y-3 mt-4">
            {topByConversions.map((campaign) => (
              <CampaignItem key={campaign.id} campaign={campaign} showRevenue={false} />
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};