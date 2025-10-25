import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Type,
  ListChecks,
  BadgePlus,
  ArrowUpCircle,
  CircleMinus,
  Calendar,
  Image,
  MousePointer2,
} from "lucide-react";

const FIELD_TYPES = [
  { id: "heading", label: "Título / Texto", description: "Destaca seções ou adiciona instruções", icon: Type },
  { id: "intent", label: "Tipo de solicitação", description: "Permite escolher entre troca, reembolso ou crédito", icon: ListChecks },
  { id: "reasons", label: "Motivo", description: "Agrupe e categorize os motivos da solicitação", icon: BadgePlus },
  { id: "refund", label: "Fluxo de reembolso", description: "Define como reembolsos são tratados", icon: ArrowUpCircle },
  { id: "return", label: "Fluxo de troca", description: "Permite sugerir variações ou substituições", icon: CircleMinus },
  { id: "date", label: "Datas importantes", description: "Coleta datas como recebimento ou postagem", icon: Calendar },
  { id: "upload", label: "Evidências", description: "Fotos, comprovantes e anexos adicionais", icon: Image },
];

interface FormBuilderToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
}

export const FormBuilderToolbar = ({ selectedTool, onToolSelect }: FormBuilderToolbarProps) => {
  return (
    <aside className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur-sm md:w-60">
      <div className="rounded-xl border border-border/60 bg-background/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Formulário</p>
            <p className="text-sm font-semibold text-foreground">Blocos disponíveis</p>
          </div>
          <Button variant="secondary" size="icon" className="rounded-lg border border-border">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Arraste um bloco para o canvas ou clique para adicioná-lo ao final do formulário.
        </p>
      </div>

      <div className="space-y-2">
        {FIELD_TYPES.map(({ id, label, description, icon: Icon }) => {
          const isActive = id === selectedTool;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToolSelect(id)}
              className={cn(
                "w-full rounded-xl border px-3 py-3 text-left transition-all",
                "flex items-start gap-3",
                isActive
                  ? "border-brand-purple bg-brand-purple/10 text-brand-purple shadow-sm"
                  : "border-border/70 bg-background/80 text-foreground hover:border-brand-purple/40 hover:bg-brand-purple/5"
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-lg border border-dashed border-border/60",
                  isActive ? "border-brand-purple text-brand-purple" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold leading-none">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
          <MousePointer2 className="h-4 w-4" />
        </div>
        Segure e arraste para reorganizar o fluxo de perguntas. Combine blocos para criar experiências condicionais.
      </div>
    </aside>
  );
};
