import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { CriteriaSection, type RefundConfig } from './CriteriaSection';
import { MethodsSection } from './MethodsSection';
import { ApprovalRulesSection } from './ApprovalRulesSection';
import { cn } from '@/lib/utils';

interface RefundConfigSectionProps {
  config: RefundConfig;
  onChange: (key: keyof RefundConfig, value: any) => void;
}

export const RefundConfigSection = ({ config, onChange }: RefundConfigSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const enabledMethodsCount = [
    config.enableCard,
    config.enablePix,
    config.enableBoleto,
    config.enableVoucher,
  ].filter(Boolean).length;

  return (
    <Card className="shadow-lg border-2 border-purple-200/50 dark:border-purple-800/30" id="refund-config">
      <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg sm:text-xl text-foreground">
                  Configurações de Reembolso
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {enabledMethodsCount} método{enabledMethodsCount !== 1 ? 's' : ''}
                  </Badge>
                  {!isExpanded && (
                    <>
                      <Badge variant="outline" className="text-xs font-normal">
                        {config.arrependimentoDays}d arrep.
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal">
                        R$ {config.autoApproveLimit}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {isExpanded ? 'Gerenciar critérios, métodos e regras de aprovação' : 'Clique para configurar reembolsos'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <CardContent className="space-y-6 pt-4">
          <CriteriaSection config={config} onChange={onChange} />

          <Separator />

          <MethodsSection config={config} onChange={onChange} />

          <Separator />

          <ApprovalRulesSection config={config} onChange={onChange} />
        </CardContent>
      </div>
    </Card>
  );
};
