import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export interface RefundConfig {
  arrependimentoDays: number;
  defeitoDays: number;
  requirePhotosForDefect: boolean;
  autoApproveLimit: number;
  prioritizeVoucher: boolean;
  voucherBonus: number;
  enableCard: boolean;
  enablePix: boolean;
  enableBoleto: boolean;
  enableVoucher: boolean;
  pixValidation: 'any' | 'cpf' | 'cnpj' | 'email' | 'phone';
}

interface CriteriaSectionProps {
  config: RefundConfig;
  onChange: (key: keyof RefundConfig, value: any) => void;
}

export const CriteriaSection = ({ config, onChange }: CriteriaSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground">Janelas de Elegibilidade</h3>
        <p className="text-sm text-muted-foreground">Configure os prazos para cada tipo de reembolso</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="arrependimentoDays" className="text-sm font-medium">
            Arrependimento (dias)
          </Label>
          <Input
            id="arrependimentoDays"
            type="number"
            min="0"
            value={config.arrependimentoDays}
            onChange={(e) => onChange('arrependimentoDays', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Dias após recebimento do produto
          </p>
        </div>

        <div>
          <Label htmlFor="defeitoDays" className="text-sm font-medium">
            Defeito/Danificado (dias)
          </Label>
          <Input
            id="defeitoDays"
            type="number"
            min="0"
            value={config.defeitoDays}
            onChange={(e) => onChange('defeitoDays', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Dias após recebimento do produto
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card/50">
        <div>
          <Label htmlFor="requirePhotos" className="text-sm font-medium cursor-pointer">
            Exigir fotos para defeitos
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cliente deve anexar fotos do produto com defeito
          </p>
        </div>
        <Switch
          id="requirePhotos"
          checked={config.requirePhotosForDefect}
          onCheckedChange={(checked) => onChange('requirePhotosForDefect', checked)}
        />
      </div>
    </div>
  );
};
