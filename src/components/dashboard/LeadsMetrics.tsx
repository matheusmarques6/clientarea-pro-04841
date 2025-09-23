import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck } from "lucide-react";

interface LeadsMetricsProps {
  klaviyoData: {
    leads_total: number;
    leads_engaged?: {
      id: string;
      nome: string;
      total: number;
    } | null;
  } | null;
}

export const LeadsMetrics = ({ klaviyoData }: LeadsMetricsProps) => {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const engagementRate = klaviyoData?.leads_engaged && klaviyoData.leads_total > 0
    ? ((klaviyoData.leads_engaged.total / klaviyoData.leads_total) * 100).toFixed(1)
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Leads Totais
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {klaviyoData?.leads_total ? formatNumber(klaviyoData.leads_total) : "0"}
          </div>
          <p className="text-xs text-muted-foreground">
            Total de perfis no Klaviyo
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Leads Engajados
          </CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {klaviyoData?.leads_engaged ? formatNumber(klaviyoData.leads_engaged.total) : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {engagementRate ? `${engagementRate}% do total` : "Segmento não configurado"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};