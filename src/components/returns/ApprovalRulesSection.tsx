import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { RefundConfig } from './CriteriaSection';

interface ApprovalRulesSectionProps {
  config: RefundConfig;
  onChange: (key: keyof RefundConfig, value: any) => void;
}

export const ApprovalRulesSection = ({ config, onChange }: ApprovalRulesSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground">Regras de Aprovação</h3>
        <p className="text-sm text-muted-foreground">Configure a automação e incentivos</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="autoApproveLimit" className="text-sm font-semibold text-foreground">
                Limite de Auto-aprovação
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Reembolsos até este valor são aprovados automaticamente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">R$</span>
            <Input
              id="autoApproveLimit"
              type="number"
              min="0"
              step="0.01"
              value={config.autoApproveLimit}
              onChange={(e) => onChange('autoApproveLimit', parseFloat(e.target.value) || 0)}
              className="max-w-[200px]"
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Até R$ {config.autoApproveLimit.toFixed(2)}
            </Badge>
            <span className="text-muted-foreground">aprovação automática</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Acima de R$ {config.autoApproveLimit.toFixed(2)}
            </Badge>
            <span className="text-muted-foreground">análise manual</span>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <Label htmlFor="prioritizeVoucher" className="text-sm font-semibold text-foreground cursor-pointer">
                Priorizar Vale-compra
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Incentivar cliente a escolher crédito na loja
              </p>
            </div>
            <Switch
              id="prioritizeVoucher"
              checked={config.prioritizeVoucher}
              onCheckedChange={(checked) => onChange('prioritizeVoucher', checked)}
            />
          </div>

          {config.prioritizeVoucher && (
            <div className="mt-4 pt-4 border-t">
              <Label htmlFor="voucherBonus" className="text-sm font-medium">
                Bônus no vale-compra
              </Label>
              <div className="flex items-center gap-3 mt-2">
                <Input
                  id="voucherBonus"
                  type="number"
                  min="0"
                  max="100"
                  value={config.voucherBonus}
                  onChange={(e) => onChange('voucherBonus', parseInt(e.target.value) || 0)}
                  className="max-w-[120px]"
                />
                <span className="text-sm font-medium text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Exemplo: Com {config.voucherBonus}% de bônus, um reembolso de R$ 100,00 vira R$ {(100 + (100 * config.voucherBonus / 100)).toFixed(2)} em crédito
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
