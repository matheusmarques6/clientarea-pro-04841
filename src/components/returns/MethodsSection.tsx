import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Smartphone, Receipt, Gift } from 'lucide-react';
import { RefundConfig } from './CriteriaSection';

interface MethodsSectionProps {
  config: RefundConfig;
  onChange: (key: keyof RefundConfig, value: any) => void;
}

export const MethodsSection = ({ config, onChange }: MethodsSectionProps) => {
  const methods = [
    {
      key: 'enableCard' as keyof RefundConfig,
      label: 'Cartão de Crédito',
      description: 'Estorno no cartão usado na compra',
      icon: CreditCard,
      color: 'text-purple-600',
    },
    {
      key: 'enablePix' as keyof RefundConfig,
      label: 'PIX',
      description: 'Transferência via PIX',
      icon: Smartphone,
      color: 'text-green-600',
    },
    {
      key: 'enableBoleto' as keyof RefundConfig,
      label: 'Boleto Bancário',
      description: 'Depósito em conta bancária',
      icon: Receipt,
      color: 'text-blue-600',
    },
    {
      key: 'enableVoucher' as keyof RefundConfig,
      label: 'Vale-compra',
      description: 'Crédito na loja com bônus',
      icon: Gift,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground">Métodos de Reembolso</h3>
        <p className="text-sm text-muted-foreground">Escolha quais métodos o cliente pode usar</p>
      </div>

      <div className="grid gap-3">
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <div
              key={method.key}
              className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background ${method.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <Label htmlFor={method.key} className="text-sm font-medium cursor-pointer">
                    {method.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
              </div>
              <Switch
                id={method.key}
                checked={config[method.key] as boolean}
                onCheckedChange={(checked) => onChange(method.key, checked)}
              />
            </div>
          );
        })}
      </div>

      {config.enablePix && (
        <div className="mt-4 p-4 rounded-lg border bg-muted/30">
          <Label htmlFor="pixValidation" className="text-sm font-medium">
            Tipo de chave PIX aceita
          </Label>
          <Select
            value={config.pixValidation}
            onValueChange={(value) => onChange('pixValidation', value as RefundConfig['pixValidation'])}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer tipo de chave</SelectItem>
              <SelectItem value="cpf">Apenas CPF</SelectItem>
              <SelectItem value="cnpj">Apenas CNPJ</SelectItem>
              <SelectItem value="email">Apenas E-mail</SelectItem>
              <SelectItem value="phone">Apenas Telefone</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Restrinja o tipo de chave PIX que o cliente pode usar
          </p>
        </div>
      )}
    </div>
  );
};
