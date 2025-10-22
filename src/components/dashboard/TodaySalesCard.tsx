import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

interface TodaySalesCardProps {
  todaySales: number;
  averageDailySales: number;
  currency: string;
}

const formatCurrency = (value: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(value);
  } catch {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

export const TodaySalesCard = ({
  todaySales,
  averageDailySales,
  currency
}: TodaySalesCardProps) => {
  // Calcular diferença percentual vs média
  const percentageVsAverage = averageDailySales > 0
    ? ((todaySales / averageDailySales - 1) * 100).toFixed(1)
    : '0.0';

  const isAboveAverage = parseFloat(percentageVsAverage) > 0;
  const trend = isAboveAverage ? 'positive' : 'negative';

  return (
    <Card className="border-primary bg-primary/5 col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Faturamento Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold text-primary">
              {formatCurrency(todaySales, currency)}
            </div>
            <div className={`text-sm mt-2 flex items-center gap-1 font-medium ${
              trend === 'positive' ? 'text-green-600' : 'text-amber-600'
            }`}>
              {isAboveAverage ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {Math.abs(parseFloat(percentageVsAverage))}%
              {isAboveAverage ? ' acima' : ' abaixo'} da média diária
            </div>
          </div>
          <div className="text-right text-muted-foreground">
            <div className="text-xs uppercase tracking-wide">Média Diária</div>
            <div className="text-xl font-semibold">
              {formatCurrency(averageDailySales, currency)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
