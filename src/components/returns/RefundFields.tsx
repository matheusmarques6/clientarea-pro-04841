import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, Receipt, Gift } from 'lucide-react';

interface RefundFieldsProps {
  method: 'CARD' | 'PIX' | 'BOLETO' | 'VOUCHER';
  onMethodChange: (method: 'CARD' | 'PIX' | 'BOLETO' | 'VOUCHER') => void;
  enabledMethods?: {
    enableCard?: boolean;
    enablePix?: boolean;
    enableBoleto?: boolean;
    enableVoucher?: boolean;
  };
}

const methodConfig = {
  CARD: {
    label: 'Cartão de Crédito',
    icon: CreditCard,
    color: 'bg-purple-100 text-purple-700 border-purple-300'
  },
  PIX: {
    label: 'PIX',
    icon: Smartphone,
    color: 'bg-green-100 text-green-700 border-green-300'
  },
  BOLETO: {
    label: 'Boleto Bancário',
    icon: Receipt,
    color: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  VOUCHER: {
    label: 'Voucher/Crédito',
    icon: Gift,
    color: 'bg-orange-100 text-orange-700 border-orange-300'
  },
};

export const RefundFields = ({ method, onMethodChange, enabledMethods }: RefundFieldsProps) => {
  // Filtrar métodos baseado nas configurações (padrão: todos habilitados)
  const methodKeys = {
    CARD: enabledMethods?.enableCard !== false,
    PIX: enabledMethods?.enablePix !== false,
    BOLETO: enabledMethods?.enableBoleto !== false,
    VOUCHER: enabledMethods?.enableVoucher !== false,
  };

  const availableMethods = Object.entries(methodConfig).filter(([key]) =>
    methodKeys[key as keyof typeof methodKeys]
  );

  return (
    <div className="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-950/10 rounded-lg border border-purple-200 dark:border-purple-900">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
          Campos de Reembolso
        </Badge>
      </div>

      <div>
        <Label htmlFor="refund-method">Método de Reembolso *</Label>
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger id="refund-method" className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMethods.map(([key, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Selecione como o cliente deseja receber o reembolso
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {availableMethods.map(([key, config]) => {
          const Icon = config.icon;
          const isSelected = method === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onMethodChange(key as 'CARD' | 'PIX' | 'BOLETO' | 'VOUCHER')}
              className={`p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? config.color + ' border-current'
                  : 'bg-background border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{config.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
