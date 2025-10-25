import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerMetricsProps {
  customersDistinct: number;
  customersReturning: number;
  layout?: "grid" | "stacked";
}

export const CustomerMetrics = ({
  customersDistinct,
  customersReturning,
  layout = "grid",
}: CustomerMetricsProps) => {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const newCustomers = customersDistinct - customersReturning;
  const returningRate = customersDistinct > 0
    ? ((customersReturning / customersDistinct) * 100).toFixed(1)
    : '0.0';

  const wrapperClass =
    layout === "stacked" ? "flex flex-col gap-4 h-full" : "grid gap-4 md:grid-cols-2";

  return (
    <div className={cn(wrapperClass)}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Clientes Novos
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(newCustomers)}
          </div>
          <p className="text-xs text-muted-foreground">
            {customersDistinct > 0
              ? `${((newCustomers / customersDistinct) * 100).toFixed(1)}% do total`
              : "Nenhum cliente novo no período"
            }
          </p>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Clientes Recorrentes
          </CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(customersReturning)}
          </div>
          <p className="text-xs text-muted-foreground">
            {customersDistinct > 0
              ? `${returningRate}% do total (fidelização)`
              : "Nenhum cliente recorrente"
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
