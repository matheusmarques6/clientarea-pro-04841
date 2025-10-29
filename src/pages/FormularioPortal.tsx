import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  DollarSign,
  Edit2,
  Eye,
  FileText,
  Globe,
  GripVertical,
  List,
  Package,
  Palette,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStores';
import { usePublicLinks, type PublicLinkTheme } from '@/hooks/usePublicLinks';
import { supportedLanguages, translations } from '@/lib/translations';
import { sanitizeColor, sanitizeTheme } from '@/lib/colorUtils';
import { validateImageFile } from '@/lib/fileValidation';
import {
  sanitizeFieldLabel,
  sanitizeFieldPlaceholder,
  sanitizeDescription,
  sanitizeTitle,
} from '@/lib/textValidation';
import { RefundConfigSection } from '@/components/returns/RefundConfigSection';
import type { RefundConfig } from '@/components/returns/CriteriaSection';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'select' | 'textarea' | 'number' | 'phone';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface SortableFieldProps {
  field: FormField;
  onSave: (field: FormField) => void;
  onDelete: () => void;
}

const SortableFieldItem = ({ field, onSave, onDelete }: SortableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<FormField>(field);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  useEffect(() => {
    setDraft(field);
  }, [field]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const handleSave = () => {
    // Sanitize all text fields before saving
    const sanitizedDraft: FormField = {
      ...draft,
      label: sanitizeFieldLabel(draft.label),
      placeholder: draft.placeholder ? sanitizeFieldPlaceholder(draft.placeholder) : undefined,
    };
    onSave(sanitizedDraft);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="space-y-4 rounded-xl border-2 border-primary/60 bg-background/70 p-4">
        <div className="flex items-center gap-3">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-primary"
            title="Arraste para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-foreground">Editando campo</span>
        </div>
        <div className="grid gap-3">
          <div>
            <Label className="text-sm font-medium text-foreground">Tipo de campo</Label>
            <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as FormField['type'] })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="textarea">Área de texto</SelectItem>
                <SelectItem value="select">Seleção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground">Label do campo</Label>
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground">Placeholder</Label>
            <Input value={draft.placeholder || ''} onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })} className="mt-1.5" />
          </div>
          {draft.type === 'select' && (
            <div>
              <Label className="text-sm font-medium text-foreground">Opções (uma por linha)</Label>
              <Textarea
                className="mt-1.5 min-h-[80px]"
                value={draft.options?.join('\n') || ''}
                onChange={(e) => setDraft({ ...draft, options: e.target.value.split('\n').filter(Boolean) })}
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-3 py-2">
            <Label className="text-sm font-medium text-foreground" htmlFor={`required-${field.id}`}>
              Campo obrigatório
            </Label>
            <Switch
              id={`required-${field.id}`}
              checked={draft.required}
              onCheckedChange={(checked) => setDraft({ ...draft, required: checked })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} className="flex-1">
            <Save className="mr-2 h-4 w-4" /> Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-4 transition hover:border-primary/50"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-primary" title="Arraste">
        <GripVertical className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{field.label}</span>
          {field.required && <Badge variant="secondary" className="text-xs">Obrigatório</Badge>}
        </div>
        <span className="text-xs text-muted-foreground capitalize">{field.type}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        itemName={field.label}
        title="Deletar campo do formulário?"
      />
    </div>
  );
};

const defaultFields: FormField[] = [
  { id: 'order', type: 'text', label: 'Número do Pedido', placeholder: 'Ex: #1234', required: true },
  { id: 'email', type: 'email', label: 'E-mail do Pedido', placeholder: 'seu@email.com', required: true },
  { id: 'name', type: 'text', label: 'Nome Completo', placeholder: 'Seu nome', required: true },
  { id: 'type', type: 'select', label: 'Tipo de Solicitação', required: true, options: ['Troca', 'Devolução'] },
];

const creditLabelMap: Record<string, string> = {
  pt: 'Reembolso',
  en: 'Refund',
  es: 'Reembolso',
  fr: 'Remboursement',
  de: 'Rückerstattung',
};

const hexToRGBA = (hex: string, alpha = 1) => {
  const sanitized = sanitizeColor(hex);
  const value = sanitized.replace('#', '');

  if (value.length !== 3 && value.length !== 6) {
    return `rgba(17, 24, 39, ${alpha})`;
  }

  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const DefaultHero = (storeName?: string): Required<Pick<PublicLinkTheme, 'heroTitle' | 'heroSubtitle' | 'heroDescription' | 'heroButtonText' | 'heroButtonColor' | 'heroButtonAlignment' | 'heroButtonRadius'>> => ({
  heroTitle: 'Trocas & Devoluções',
  heroSubtitle: `Portal público da ${storeName ?? 'sua loja'}`,
  heroDescription: 'Preencha os dados abaixo para solicitar a troca ou devolução do seu produto.',
  heroButtonText: 'Enviar solicitação',
  heroButtonColor: '#3b82f6',
  heroButtonAlignment: 'center',
  heroButtonRadius: 12,
});

const defaultRefundFields: FormField[] = [
  { id: 'order', type: 'text', label: 'Número do Pedido', placeholder: 'Ex: #1234', required: true },
  { id: 'email', type: 'email', label: 'E-mail do Pedido', placeholder: 'seu@email.com', required: true },
  { id: 'name', type: 'text', label: 'Nome Completo', placeholder: 'Seu nome', required: true },
  { id: 'reason', type: 'select', label: 'Motivo do Reembolso', required: true, options: ['Arrependimento', 'Produto com Defeito', 'Produto Diferente do Anunciado', 'Outro'] },
];

const FormularioPortal = () => {
  const { toast } = useToast();
  const { id: storeId } = useParams();
  const { store, isLoading } = useStore(storeId!);

  // Active tab state with localStorage persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem('formulario-portal-active-tab');
    return saved || 'returns';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('formulario-portal-active-tab', value);
  };

  // Returns form hooks and state
  const { config: publicConfig, loading: configLoading, saveConfig, uploadLogo, getPublicUrl } = usePublicLinks(storeId!, 'returns');
  const [formFields, setFormFields] = useState<FormField[]>(defaultFields);

  // Refunds form hooks and state
  const {
    config: refundPublicConfig,
    loading: refundConfigLoading,
    saveConfig: saveRefundConfig,
    uploadLogo: uploadRefundLogo,
    getPublicUrl: getRefundPublicUrl,
    refetch: refetchRefundConfig
  } = usePublicLinks(storeId!, 'refunds');
  const [refundFormFields, setRefundFormFields] = useState<FormField[]>(defaultRefundFields);

  // Returns form state
  const [theme, setTheme] = useState<PublicLinkTheme>({
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    lineColor: '#1f2937',
    lineWidth: 1,
    ...DefaultHero(),
  });
  const [config, setConfig] = useState({ janelaDias: 15, valorMinimo: 50, exigirFotos: true, aprovarAuto: true, mensagem: '' });
  const [refundConfig, setRefundConfig] = useState<RefundConfig>({
    arrependimentoDays: 7,
    defeitoDays: 30,
    requirePhotosForDefect: true,
    autoApproveLimit: 100,
    prioritizeVoucher: true,
    voucherBonus: 10,
    enableCard: true,
    enablePix: true,
    enableBoleto: false,
    enableVoucher: true,
    pixValidation: 'any',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingLogoDark, setIsUploadingLogoDark] = useState(false);

  // Refunds form state
  const [refundTheme, setRefundTheme] = useState<PublicLinkTheme>({
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    lineColor: '#1f2937',
    lineWidth: 1,
    heroTitle: 'Reembolsos',
    heroSubtitle: store?.name ? `Portal público da ${store.name}` : '',
    heroDescription: 'Preencha os dados abaixo para solicitar o reembolso do seu pedido.',
    heroButtonText: 'Solicitar reembolso',
    heroButtonColor: '#10b981',
    heroButtonAlignment: 'center',
    heroButtonRadius: 12,
  });
  const [refundLogoFile, setRefundLogoFile] = useState<File | null>(null);
  const [refundLogoPreview, setRefundLogoPreview] = useState<string | null>(null);
  const [refundLogoDarkFile, setRefundLogoDarkFile] = useState<File | null>(null);
  const [refundLogoDarkPreview, setRefundLogoDarkPreview] = useState<string | null>(null);
  const [isRefundSaving, setIsRefundSaving] = useState(false);
  const [isRefundUploadingLogo, setIsRefundUploadingLogo] = useState(false);
  const [isRefundUploadingLogoDark, setIsRefundUploadingLogoDark] = useState(false);
  const languageOptions = useMemo(() => supportedLanguages.slice(), []);
  const hasLanguageOptions = languageOptions.length > 0;
  const [returnsLanguage, setReturnsLanguage] = useState('pt');
  const [refundsLanguage, setRefundsLanguage] = useState('pt');
  const fallbackLanguage = languageOptions[0]?.code ?? 'pt';
  const selectedLanguage = useMemo(
    () => languageOptions.find((lang) => lang.code === returnsLanguage) ?? languageOptions[0],
    [languageOptions, returnsLanguage]
  );
  const selectedRefundLanguage = useMemo(
    () => languageOptions.find((lang) => lang.code === refundsLanguage) ?? languageOptions[0],
    [languageOptions, refundsLanguage]
  );
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [isRefundHeroModalOpen, setIsRefundHeroModalOpen] = useState(false);
  const palette = useMemo(() => {
    const background = theme.backgroundColor || '#0f172a';
    const text = theme.textColor || '#f9fafb';
    const line = theme.lineColor ? sanitizeColor(theme.lineColor) : hexToRGBA(text, 0.14);
    const width = Number.isFinite(theme.lineWidth) ? Math.max(1, Math.min(6, theme.lineWidth as number)) : 1;
    return {
      background,
      text,
      surface: hexToRGBA(background, 0.78),
      surfaceStrong: hexToRGBA(background, 0.58),
      border: line,
      lineWidth: width,
    };
  }, [theme.backgroundColor, theme.textColor, theme.lineColor, theme.lineWidth]);

  const refundPalette = useMemo(() => {
    const background = refundTheme.backgroundColor || '#0f172a';
    const text = refundTheme.textColor || '#f9fafb';
    const line = refundTheme.lineColor ? sanitizeColor(refundTheme.lineColor) : hexToRGBA(text, 0.14);
    const width = Number.isFinite(refundTheme.lineWidth) ? Math.max(1, Math.min(6, refundTheme.lineWidth as number)) : 1;
    return {
      background,
      text,
      surface: hexToRGBA(background, 0.78),
      surfaceStrong: hexToRGBA(background, 0.58),
      border: line,
      lineWidth: width,
    };
  }, [refundTheme.backgroundColor, refundTheme.textColor, refundTheme.lineColor, refundTheme.lineWidth]);

  useEffect(() => {
    if (hasLanguageOptions && !languageOptions.some((lang) => lang.code === returnsLanguage)) {
      setReturnsLanguage(fallbackLanguage);
    }
  }, [hasLanguageOptions, languageOptions, returnsLanguage, fallbackLanguage]);

  useEffect(() => {
    if (hasLanguageOptions && !languageOptions.some((lang) => lang.code === refundsLanguage)) {
      setRefundsLanguage(fallbackLanguage);
    }
  }, [hasLanguageOptions, languageOptions, refundsLanguage, fallbackLanguage]);

  const [heroDraft, setHeroDraft] = useState({
    title: '',
    subtitle: '',
    description: '',
    buttonText: '',
    buttonColor: '',
    buttonAlignment: 'center' as 'left' | 'center' | 'right',
    buttonRadius: 12,
  });

  const [refundHeroDraft, setRefundHeroDraft] = useState({
    title: '',
    subtitle: '',
    description: '',
    buttonText: '',
    buttonColor: '',
    buttonAlignment: 'center' as 'left' | 'center' | 'right',
    buttonRadius: 12,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const publicUrl = useMemo(() => (store ? getPublicUrl(store.name) : null), [store, getPublicUrl]);
  const refundPublicUrl = useMemo(() => (store ? getRefundPublicUrl(store.name) : null), [store, getRefundPublicUrl]);
  const defaultHeroForStore = useMemo(() => DefaultHero(store?.name), [store?.name]);
  const activeCopy = useMemo(
    () => translations.returns[returnsLanguage as keyof typeof translations.returns] ?? translations.returns.pt,
    [returnsLanguage]
  );
  const defaultFieldMap = useMemo(() => Object.fromEntries(defaultFields.map((field) => [field.id, field])), []);
  const fieldTranslations = useMemo(() => {
    const creditLabel = creditLabelMap[returnsLanguage] ?? creditLabelMap.pt;
    return {
      order: { label: activeCopy.orderNumber },
      email: { label: activeCopy.orderEmail },
      name: { label: activeCopy.fullName },
      type: {
        label: activeCopy.requestTypeTitle,
        options: [activeCopy.exchange, activeCopy.return, creditLabel],
      },
    } as Record<string, { label: string; options?: string[] }>;
  }, [activeCopy, returnsLanguage]);

  useEffect(() => {
    if (!publicConfig || !store) return;

    const incomingLanguage =
      publicConfig.auto_rules?.language ||
      (publicConfig as { language?: string }).language ||
      fallbackLanguage;

    if (publicConfig.auto_rules?.fields) {
      const normalizedFields = publicConfig.auto_rules.fields.map((field: FormField) => {
        const normalizedLabel = field.label === 'Crédito' ? 'Reembolso' : field.label;
        const normalizedOptions = field.options?.map((option) =>
          option === 'Crédito' ? 'Reembolso' : option
        );
        return {
          ...field,
          label: normalizedLabel,
          options: normalizedOptions,
        };
      });
      setFormFields(normalizedFields);
    }

    setConfig((prev) => ({
      ...prev,
      janelaDias: publicConfig.auto_rules?.janelaDias ?? prev.janelaDias,
      valorMinimo: publicConfig.auto_rules?.valorMinimo ?? prev.valorMinimo,
      exigirFotos: publicConfig.auto_rules?.exigirFotos ?? prev.exigirFotos,
      aprovarAuto: publicConfig.auto_rules?.aprovarAuto ?? prev.aprovarAuto,
      mensagem:
        (publicConfig.messages &&
          (publicConfig.messages as Record<string, string | undefined>)[incomingLanguage]) ??
        '',
    }));

    // Carregar configurações de reembolso
    if (publicConfig.auto_rules?.refund_settings) {
      setRefundConfig((prev) => ({
        ...prev,
        ...publicConfig.auto_rules.refund_settings,
      }));
    }

    setReturnsLanguage((prev) => (prev === incomingLanguage ? prev : incomingLanguage));

    setTheme((prev) => ({
      ...prev,
      primaryColor: publicConfig.auto_rules?.theme?.primaryColor || prev.primaryColor,
      secondaryColor: publicConfig.auto_rules?.theme?.secondaryColor || prev.secondaryColor,
      backgroundColor: publicConfig.auto_rules?.theme?.backgroundColor || prev.backgroundColor,
      textColor: publicConfig.auto_rules?.theme?.textColor || prev.textColor,
      lineColor: publicConfig.auto_rules?.theme?.lineColor || prev.lineColor || '#1f2937',
      lineWidth: publicConfig.auto_rules?.theme?.lineWidth ?? prev.lineWidth ?? 1,
      logoUrl: publicConfig.auto_rules?.theme?.logoUrl || prev.logoUrl,
      heroTitle: publicConfig.auto_rules?.theme?.heroTitle || prev.heroTitle || DefaultHero(store.name).heroTitle,
      heroSubtitle: publicConfig.auto_rules?.theme?.heroSubtitle || `Portal público da ${store.name}`,
      heroDescription: publicConfig.auto_rules?.theme?.heroDescription || prev.heroDescription,
      heroButtonText: publicConfig.auto_rules?.theme?.heroButtonText || prev.heroButtonText,
      heroButtonColor: publicConfig.auto_rules?.theme?.heroButtonColor || prev.heroButtonColor,
      heroButtonAlignment: publicConfig.auto_rules?.theme?.heroButtonAlignment || 'center',
      heroButtonRadius: publicConfig.auto_rules?.theme?.heroButtonRadius ?? 12,
    }));
    setLogoPreview(publicConfig.auto_rules?.theme?.logoUrl ?? null);
  }, [publicConfig, store, fallbackLanguage]);

  // Load refund configuration
  useEffect(() => {
    if (!refundPublicConfig || !store) return;

    console.log('🔄 [FormularioPortal] Loading refund config:', refundPublicConfig);
    console.log('🔄 [FormularioPortal] Refund auto_rules:', refundPublicConfig.auto_rules);
    console.log('🔄 [FormularioPortal] Refund fields from DB:', refundPublicConfig.auto_rules?.fields);

    const incomingLanguage =
      refundPublicConfig.auto_rules?.language ||
      (refundPublicConfig as { language?: string }).language ||
      fallbackLanguage;

    if (refundPublicConfig.auto_rules?.fields) {
      console.log('✅ [FormularioPortal] Setting refund fields to:', refundPublicConfig.auto_rules.fields);
      setRefundFormFields(refundPublicConfig.auto_rules.fields);
    } else {
      console.log('⚠️ [FormularioPortal] No refund fields found in config, using defaults');
    }

    setRefundsLanguage((prev) => (prev === incomingLanguage ? prev : incomingLanguage));

    // Load refund config (payment methods, eligibility, approval rules)
    if (refundPublicConfig.auto_rules?.config) {
      console.log('✅ [FormularioPortal] Loading refund config from DB:', refundPublicConfig.auto_rules.config);
      setRefundConfig((prev) => ({
        ...prev,
        ...refundPublicConfig.auto_rules.config,
      }));
    } else {
      console.log('⚠️ [FormularioPortal] No refund config found in DB, using defaults');
    }

    console.log('🎨 [FormularioPortal] Theme from DB:', refundPublicConfig.auto_rules?.theme);
    console.log('🎨 [FormularioPortal] Primary color from DB:', refundPublicConfig.auto_rules?.theme?.primaryColor);

    setRefundTheme((prev) => {
      const newTheme = {
        ...prev,
        primaryColor: refundPublicConfig.auto_rules?.theme?.primaryColor || prev.primaryColor,
        secondaryColor: refundPublicConfig.auto_rules?.theme?.secondaryColor || prev.secondaryColor,
        backgroundColor: refundPublicConfig.auto_rules?.theme?.backgroundColor || prev.backgroundColor,
        textColor: refundPublicConfig.auto_rules?.theme?.textColor || prev.textColor,
        lineColor: refundPublicConfig.auto_rules?.theme?.lineColor || prev.lineColor || '#1f2937',
        lineWidth: refundPublicConfig.auto_rules?.theme?.lineWidth ?? prev.lineWidth ?? 1,
        logoUrl: refundPublicConfig.auto_rules?.theme?.logoUrl || prev.logoUrl,
        heroTitle: refundPublicConfig.auto_rules?.theme?.heroTitle || 'Reembolsos',
        heroSubtitle: refundPublicConfig.auto_rules?.theme?.heroSubtitle || `Portal público da ${store.name}`,
        heroDescription: refundPublicConfig.auto_rules?.theme?.heroDescription || prev.heroDescription,
        heroButtonText: refundPublicConfig.auto_rules?.theme?.heroButtonText || prev.heroButtonText,
        heroButtonColor: refundPublicConfig.auto_rules?.theme?.heroButtonColor || prev.heroButtonColor,
        heroButtonAlignment: refundPublicConfig.auto_rules?.theme?.heroButtonAlignment || 'center',
        heroButtonRadius: refundPublicConfig.auto_rules?.theme?.heroButtonRadius ?? 12,
      };

      console.log('🎨 [FormularioPortal] New theme state:', newTheme);
      return newTheme;
    });
    setRefundLogoPreview(refundPublicConfig.auto_rules?.theme?.logoUrl ?? null);
    setRefundLogoDarkPreview(refundPublicConfig.auto_rules?.theme?.logoDarkUrl ?? null);
  }, [refundPublicConfig, store, fallbackLanguage]);

  useEffect(() => {
    setHeroDraft({
      title: theme.heroTitle || '',
      subtitle: theme.heroSubtitle || (store ? `Portal público da ${store.name}` : ''),
      description: theme.heroDescription || '',
      buttonText: theme.heroButtonText || '',
      buttonColor: theme.heroButtonColor || theme.primaryColor,
      buttonAlignment: theme.heroButtonAlignment || 'center',
      buttonRadius: theme.heroButtonRadius ?? 12,
    });
  }, [theme, store]);

  useEffect(() => {
    setRefundHeroDraft({
      title: refundTheme.heroTitle || '',
      subtitle: refundTheme.heroSubtitle || (store ? `Portal público da ${store.name}` : ''),
      description: refundTheme.heroDescription || '',
      buttonText: refundTheme.heroButtonText || '',
      buttonColor: refundTheme.heroButtonColor || refundTheme.primaryColor,
      buttonAlignment: refundTheme.heroButtonAlignment || 'center',
      buttonRadius: refundTheme.heroButtonRadius ?? 12,
    });
  }, [refundTheme, store]);

  useEffect(() => {
    if (!publicConfig) return;
    setConfig((prev) => ({
      ...prev,
      mensagem:
        (publicConfig.messages &&
          (publicConfig.messages as Record<string, string | undefined>)[returnsLanguage]) ??
        '',
    }));
  }, [publicConfig, returnsLanguage]);

  // Scroll automático para seção de reembolso se hash estiver presente
  useEffect(() => {
    if (window.location.hash === '#refund-config') {
      // Mudar para aba de reembolsos
      handleTabChange('refunds');

      setTimeout(() => {
        const element = document.getElementById('refund-config');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Expandir a seção clicando nela
          element.click();
        }
      }, 500);
    }
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Prevent concurrent uploads
    if (isUploadingLogo) {
      toast({
        title: 'Upload em andamento',
        description: 'Aguarde o upload atual finalizar',
        variant: 'destructive'
      });
      return;
    }

    // Reset the input value to allow re-uploading the same file
    event.target.value = '';

    // Comprehensive validation
    try {
      setIsUploadingLogo(true);
      toast({ title: 'Validando arquivo...', description: 'Verificando segurança da imagem' });

      const validation = await validateImageFile(file);

      if (!validation.valid) {
        toast({
          title: 'Arquivo inválido',
          description: validation.error,
          variant: 'destructive'
        });
        setIsUploadingLogo(false);
        return;
      }

      // File is valid, proceed with upload
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        setLogoPreview(previewUrl);
        setTheme((prev) => ({ ...prev, logoUrl: previewUrl }));
        toast({
          title: 'Imagem válida',
          description: validation.dimensions
            ? `${validation.dimensions.width}x${validation.dimensions.height}px`
            : 'Pronta para upload'
        });
        setIsUploadingLogo(false);
      };
      reader.onerror = () => {
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Tente novamente',
          variant: 'destructive'
        });
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error validating file:', error);
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Tente novamente com outra imagem',
        variant: 'destructive'
      });
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!store) return;

    // Prevent concurrent saves
    if (isSaving) {
      toast({
        title: 'Salvando...',
        description: 'Aguarde a operação atual finalizar',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      toast({ title: 'Salvando...', description: 'Atualizando portal público' });

      let logoUrl = theme.logoUrl;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
        setTheme((prev) => ({ ...prev, logoUrl }));
      }

      // Sanitize all color values before saving
      const sanitizedTheme = sanitizeTheme(
        {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          backgroundColor: theme.backgroundColor,
          textColor: theme.textColor,
          heroButtonColor: heroDraft.buttonColor,
          lineColor: theme.lineColor,
        },
        ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'heroButtonColor', 'lineColor']
      );

      const sanitizedLineWidth = Number.isFinite(theme.lineWidth)
        ? Math.max(1, Math.min(6, Math.round(theme.lineWidth!)))
        : 1;

      // Sanitize all text fields before saving
      const payloadTheme: PublicLinkTheme = {
        ...sanitizedTheme,
        lineColor: sanitizedTheme.lineColor || sanitizeColor(theme.lineColor || '#1f2937'),
        logoUrl,
        heroTitle: sanitizeTitle(heroDraft.title || ''),
        heroSubtitle: sanitizeDescription(heroDraft.subtitle || ''),
        heroDescription: sanitizeDescription(heroDraft.description || ''),
        heroButtonText: sanitizeFieldLabel(heroDraft.buttonText || ''),
        heroButtonAlignment: heroDraft.buttonAlignment,
        heroButtonRadius: heroDraft.buttonRadius,
        lineWidth: sanitizedLineWidth,
      };

      // Sanitize message text
      const sanitizedMessage = sanitizeDescription(config.mensagem || '', false);

      const updatedMessages: Record<string, string> = {
        ...(publicConfig?.messages || {}),
        [returnsLanguage]: sanitizedMessage,
      };

      // Sanitize all form fields before saving
      const sanitizedFields = formFields.map(field => ({
        ...field,
        label: sanitizeFieldLabel(field.label),
        placeholder: field.placeholder ? sanitizeFieldPlaceholder(field.placeholder) : undefined,
      }));

      await saveConfig({
        storeName: store.name,
        auto_rules: {
          janelaDias: config.janelaDias,
          valorMinimo: config.valorMinimo,
          exigirFotos: config.exigirFotos,
          aprovarAuto: config.aprovarAuto,
          fields: sanitizedFields,
          theme: payloadTheme,
          refund_settings: refundConfig,
        },
        messages: updatedMessages,
        language: returnsLanguage,
        enabled: true,
      });

      toast({ title: 'Configurações salvas', description: 'Portal atualizado com sucesso.' });
      setLogoFile(null);
    } catch (error) {
      // toast handled in hook
      console.error('Error saving config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank', 'noopener');
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type: 'text',
      label: 'Novo campo',
      placeholder: '',
      required: false,
    };
    setFormFields((prev) => [...prev, newField]);
    toast({ title: 'Campo adicionado', description: 'Clique no lápis para personalizar.' });
  };

  const handleDeleteField = (id: string) => {
    setFormFields((prev) => prev.filter((field) => field.id !== id));
  };

  const handleSaveField = (updated: FormField) => {
    setFormFields((prev) => prev.map((field) => (field.id === updated.id ? updated : field)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFormFields((prev) => {
      const oldIndex = prev.findIndex((field) => field.id === active.id);
      const newIndex = prev.findIndex((field) => field.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleRefundConfigChange = (key: keyof RefundConfig, value: any) => {
    setRefundConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Refund form handlers
  const handleRefundLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isRefundUploadingLogo) {
      toast({
        title: 'Upload em andamento',
        description: 'Aguarde o upload atual finalizar',
        variant: 'destructive'
      });
      return;
    }

    event.target.value = '';

    try {
      setIsRefundUploadingLogo(true);
      toast({ title: 'Validando arquivo...', description: 'Verificando segurança da imagem' });

      const validation = await validateImageFile(file);

      if (!validation.valid) {
        toast({
          title: 'Arquivo inválido',
          description: validation.error,
          variant: 'destructive'
        });
        setIsRefundUploadingLogo(false);
        return;
      }

      setRefundLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        setRefundLogoPreview(previewUrl);
        setRefundTheme((prev) => ({ ...prev, logoUrl: previewUrl }));
        toast({
          title: 'Imagem válida',
          description: validation.dimensions
            ? `${validation.dimensions.width}x${validation.dimensions.height}px`
            : 'Pronta para upload'
        });
        setIsRefundUploadingLogo(false);
      };
      reader.onerror = () => {
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Tente novamente',
          variant: 'destructive'
        });
        setIsRefundUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error validating file:', error);
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Tente novamente com outra imagem',
        variant: 'destructive'
      });
      setIsRefundUploadingLogo(false);
    }
  };

  const handleRefundLogoDarkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isRefundUploadingLogoDark) {
      toast({
        title: 'Upload em andamento',
        description: 'Aguarde o upload atual finalizar',
        variant: 'destructive'
      });
      return;
    }

    event.target.value = '';

    try {
      setIsRefundUploadingLogoDark(true);
      toast({ title: 'Validando arquivo...', description: 'Verificando segurança da imagem' });

      const validation = await validateImageFile(file);

      if (!validation.valid) {
        toast({
          title: 'Arquivo inválido',
          description: validation.error,
          variant: 'destructive'
        });
        setIsRefundUploadingLogoDark(false);
        return;
      }

      setRefundLogoDarkFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        setRefundLogoDarkPreview(previewUrl);
        setRefundTheme((prev) => ({ ...prev, logoDarkUrl: previewUrl }));
        toast({
          title: 'Imagem válida (tema claro)',
          description: validation.dimensions
            ? `${validation.dimensions.width}x${validation.dimensions.height}px`
            : 'Pronta para upload'
        });
        setIsRefundUploadingLogoDark(false);
      };
      reader.onerror = () => {
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Tente novamente',
          variant: 'destructive'
        });
        setIsRefundUploadingLogoDark(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error validating file:', error);
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Tente novamente com outra imagem',
        variant: 'destructive'
      });
      setIsRefundUploadingLogoDark(false);
    }
  };

  const handleRefundSave = async () => {
    if (!store) return;

    if (isRefundSaving) {
      toast({
        title: 'Salvando...',
        description: 'Aguarde a operação atual finalizar',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsRefundSaving(true);
      toast({ title: 'Salvando...', description: 'Atualizando portal de reembolsos' });

      let logoUrl = refundTheme.logoUrl;
      if (refundLogoFile) {
        logoUrl = await uploadRefundLogo(refundLogoFile);
        setRefundTheme((prev) => ({ ...prev, logoUrl }));
      }

      let logoDarkUrl = refundTheme.logoDarkUrl;
      if (refundLogoDarkFile) {
        logoDarkUrl = await uploadRefundLogo(refundLogoDarkFile);
        setRefundTheme((prev) => ({ ...prev, logoDarkUrl }));
      }

      console.log('🎨 [FormularioPortal] Refund theme BEFORE sanitize:', {
        primaryColor: refundTheme.primaryColor,
        secondaryColor: refundTheme.secondaryColor,
        backgroundColor: refundTheme.backgroundColor,
        textColor: refundTheme.textColor,
        heroButtonColor: refundHeroDraft.buttonColor,
        lineColor: refundTheme.lineColor,
      });

      const sanitizedTheme = sanitizeTheme(
        {
          primaryColor: refundTheme.primaryColor,
          secondaryColor: refundTheme.secondaryColor,
          backgroundColor: refundTheme.backgroundColor,
          textColor: refundTheme.textColor,
          heroButtonColor: refundHeroDraft.buttonColor,
          lineColor: refundTheme.lineColor,
        },
        ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'heroButtonColor', 'lineColor']
      );

      console.log('🎨 [FormularioPortal] Sanitized theme:', sanitizedTheme);

      const sanitizedLineWidth = Number.isFinite(refundTheme.lineWidth)
        ? Math.max(1, Math.min(6, Math.round(refundTheme.lineWidth!)))
        : 1;

      const payloadTheme: PublicLinkTheme = {
        ...sanitizedTheme,
        lineColor: sanitizedTheme.lineColor || sanitizeColor(refundTheme.lineColor || '#1f2937'),
        logoUrl,
        logoDarkUrl,
        heroTitle: sanitizeTitle(refundHeroDraft.title || ''),
        heroSubtitle: sanitizeDescription(refundHeroDraft.subtitle || ''),
        heroDescription: sanitizeDescription(refundHeroDraft.description || ''),
        heroButtonText: sanitizeFieldLabel(refundHeroDraft.buttonText || ''),
        heroButtonAlignment: refundHeroDraft.buttonAlignment,
        heroButtonRadius: refundHeroDraft.buttonRadius,
        lineWidth: sanitizedLineWidth,
      };

      const sanitizedFields = refundFormFields.map(field => ({
        ...field,
        label: sanitizeFieldLabel(field.label),
        placeholder: field.placeholder ? sanitizeFieldPlaceholder(field.placeholder) : undefined,
      }));

      console.log('💾 [FormularioPortal] Saving refund fields:', sanitizedFields);
      console.log('💾 [FormularioPortal] Saving refund theme:', payloadTheme);
      console.log('💾 [FormularioPortal] Saving refund config:', refundConfig);

      await saveRefundConfig({
        storeName: store.name,
        auto_rules: {
          fields: sanitizedFields,
          theme: payloadTheme,
          config: refundConfig,
        },
        messages: {},
        language: refundsLanguage,
        enabled: true,
      });

      // Refetch to get updated URL
      await refetchRefundConfig();

      toast({ title: 'Configurações salvas', description: 'Portal de reembolsos atualizado com sucesso.' });
      setRefundLogoFile(null);
    } catch (error) {
      console.error('Error saving refund config:', error);
    } finally {
      setIsRefundSaving(false);
    }
  };

  const handleRefundPreview = () => {
    if (refundPublicUrl) {
      window.open(refundPublicUrl, '_blank', 'noopener');
    }
  };

  const handleAddRefundField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type: 'text',
      label: 'Novo campo',
      placeholder: '',
      required: false,
    };
    setRefundFormFields((prev) => [...prev, newField]);
    toast({ title: 'Campo adicionado', description: 'Clique no lápis para personalizar.' });
  };

  const handleDeleteRefundField = (id: string) => {
    setRefundFormFields((prev) => prev.filter((field) => field.id !== id));
  };

  const handleSaveRefundField = (updated: FormField) => {
    setRefundFormFields((prev) => prev.map((field) => (field.id === updated.id ? updated : field)));
  };

  const handleDragEndRefund = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRefundFormFields((prev) => {
      const oldIndex = prev.findIndex((field) => field.id === active.id);
      const newIndex = prev.findIndex((field) => field.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  if (isLoading || configLoading || refundConfigLoading || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-6 w-full max-w-4xl mx-auto p-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const fallbackSubtitle = store?.name ? `${activeCopy.subtitle} ${store.name}` : defaultHeroForStore.heroSubtitle;
  const previewHeroTitle =
    theme.heroTitle && theme.heroTitle !== defaultHeroForStore.heroTitle ? theme.heroTitle : activeCopy.title;
  const previewHeroSubtitle =
    theme.heroSubtitle && theme.heroSubtitle !== defaultHeroForStore.heroSubtitle ? theme.heroSubtitle : fallbackSubtitle;
  const previewHeroDescription =
    theme.heroDescription && theme.heroDescription !== defaultHeroForStore.heroDescription
      ? theme.heroDescription
      : activeCopy.formDescription;
  const previewHeroButtonText =
    theme.heroButtonText && theme.heroButtonText !== defaultHeroForStore.heroButtonText
      ? theme.heroButtonText
      : activeCopy.submitButton;

  const previewStyles = {
    '--primary-color': theme.primaryColor,
    '--background-color': theme.backgroundColor,
    '--text-color': theme.textColor,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="container mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/store/${storeId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Construtor do formulário público</h1>
              <p className="text-muted-foreground">{store.name}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="returns" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Trocas e Devoluções
            </TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Reembolsos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="returns">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <Card className="shadow-lg border-2 border-blue-200/50 dark:border-blue-800/30">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                    <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl text-foreground">
                      URL do portal público
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Link compartilhável para seus clientes
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {publicUrl ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input value={publicUrl} readOnly className="font-mono text-sm" />
                      <Button variant="secondary" onClick={() => navigator.clipboard.writeText(publicUrl)}>
                        <Copy className="mr-2 h-4 w-4" /> Copiar
                      </Button>
                    </div>
                    <Badge variant="outline">Slug: {publicUrl.split('/').pop()}</Badge>
                  </>
                ) : (
                  <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-900/20">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      URL ainda não disponível
                    </p>
                    <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                      Salve as configurações do formulário para gerar um link público único e seguro.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-indigo-200/50 dark:border-indigo-800/30">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0">
                    <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl text-foreground">
                      Cabeçalho do formulário
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Personalize título, descrição e botão do portal público
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" className="flex items-center gap-2 px-3 flex-shrink-0" onClick={() => setIsHeroModalOpen(true)}>
                    <Edit2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card className="shadow-lg border-2 border-green-200/50 dark:border-green-800/30">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                    <List className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl text-foreground">
                      Campos do formulário
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Arraste os campos para reordenar ou clique no ícone de edição para personalizar
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={formFields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {formFields.map((field) => (
                        <SortableFieldItem
                          key={field.id}
                          field={field}
                          onSave={handleSaveField}
                          onDelete={() => handleDeleteField(field.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="flex justify-center">
                  <Button size="sm" onClick={handleAddField}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar campo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-pink-200/50 dark:border-pink-800/30">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex-shrink-0">
                    <Palette className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl text-foreground">
                      Personalização visual
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Customize cores, logo e aparência do portal
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground">Logo da loja</Label>
                  <div className="mt-3 space-y-4">
                    {logoPreview && (
                      <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/60 p-4">
                        <img src={logoPreview} alt="Preview da logo" className="h-16 w-auto" />
                        <Button variant="outline" size="sm" onClick={() => { setLogoPreview(null); setLogoFile(null); setTheme((prev) => ({ ...prev, logoUrl: undefined })); }}>
                          Remover
                        </Button>
                      </div>
                    )}
                    <div className="rounded-lg border-2 border-dashed border-border/50 p-6 text-center">
                      <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <label htmlFor="logo-upload" className="flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-6 w-6" /> Clique para enviar logo (PNG, JPG ou SVG)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      { key: 'primaryColor', label: 'Cor primária' },
                      { key: 'secondaryColor', label: 'Cor secundária' },
                      { key: 'backgroundColor', label: 'Cor de fundo' },
                      { key: 'textColor', label: 'Cor do texto' },
                      { key: 'heroButtonColor', label: 'Cor do botão' },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-sm font-medium text-foreground">{label}</Label>
                      <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                        <input
                          type="color"
                          value={theme[key] || theme.primaryColor}
                          onChange={(e) => {
                            const sanitized = sanitizeColor(e.target.value);
                            setTheme((prev) => ({ ...prev, [key]: sanitized }));
                            if (key === 'heroButtonColor') {
                              setHeroDraft((prev) => ({ ...prev, buttonColor: sanitized }));
                            }
                          }}
                          className="h-9 w-full cursor-pointer rounded border border-border bg-background"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground">Espessura das linhas</Label>
                  <div className="mt-2 space-y-2">
                    <Slider
                      value={[theme.lineWidth ?? 1]}
                      max={6}
                      min={1}
                      step={1}
                      onValueChange={(value) => setTheme((prev) => ({ ...prev, lineWidth: value[0] }))}
                    />
                    <p className="text-xs text-muted-foreground">{theme.lineWidth ?? 1}px</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground">Mensagem de confirmação</Label>
                  <Textarea
                    className="mt-2 min-h-[90px]"
                    value={config.mensagem}
                    onChange={(e) => setConfig((prev) => ({ ...prev, mensagem: e.target.value }))}
                    placeholder="Sua solicitação foi recebida e está em análise."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-6 shadow-lg border-2 border-orange-200/50 dark:border-orange-800/30">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                      <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl text-foreground">
                        Preview em tempo real
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Visualize as mudanças instantaneamente
                      </p>
                    </div>
                  </div>
                  {hasLanguageOptions && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                          role="button"
                          tabIndex={0}
                        >
                          {selectedLanguage?.flag && <span>{selectedLanguage.flag}</span>}
                          <span>{selectedLanguage?.name ?? 'Idioma'}</span>
                          <ChevronDown className="h-3 w-3 opacity-40" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 rounded-lg border border-border/40 bg-card/95 p-1 shadow-lg backdrop-blur"
                      >
                        <DropdownMenuRadioGroup
                          value={returnsLanguage}
                          onValueChange={(value) => value && setReturnsLanguage(value)}
                        >
                          {languageOptions.map((lang) => (
                            <DropdownMenuRadioItem
                              key={lang.code}
                              value={lang.code}
                              className="w-full px-2 py-1.5"
                            >
                              <span className="text-base leading-none">{lang.flag}</span>
                              <span className="flex-1">{lang.name}</span>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-xl border bg-background"
                  style={{
                    ...previewStyles,
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    borderWidth: `${palette.lineWidth ?? 1}px`,
                    color: palette.text,
                  }}
                >
                  <div
                    className="space-y-6 p-8"
                    style={{ backgroundColor: palette.background, color: palette.text }}
                  >
                    <div className="space-y-3 text-center">
                      {theme.logoUrl && (
                        <div className="flex justify-center">
                          <img src={theme.logoUrl} alt="Logo" className="h-12 w-auto" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-semibold" style={{ color: theme.primaryColor }}>
                          {previewHeroTitle}
                        </h2>
                        <p className="text-sm opacity-70">{previewHeroSubtitle}</p>
                      </div>
                      <p className="text-sm opacity-80">{previewHeroDescription}</p>
                    </div>

                      <div className="space-y-3">
                        {formFields.map((field) => {
                          const defaultField = defaultFieldMap[field.id];
                          const translationInfo = fieldTranslations[field.id];
                          const labelIsDefault = Boolean(defaultField && field.label === defaultField.label);
                          const displayLabel =
                            labelIsDefault && translationInfo?.label ? translationInfo.label : field.label;
                          const shouldTranslateOptions =
                            field.id === 'type' &&
                            Array.isArray(field.options) &&
                            Boolean(
                              defaultField?.options &&
                                field.options?.join('|') === defaultField.options?.join('|') &&
                                translationInfo?.options
                            );
                          const displayOptions =
                            shouldTranslateOptions && translationInfo?.options ? translationInfo.options : field.options;
                          const placeholderText =
                            field.placeholder ?? defaultField?.placeholder ?? (field.type === 'textarea' ? '' : undefined);

                          return (
                            <div key={field.id} className="space-y-1.5">
                              <span className="text-sm font-medium">
                                {displayLabel} {field.required && <span className="text-red-500">*</span>}
                              </span>
                              <div
                                className="flex h-10 items-center rounded px-3 text-xs"
                                style={{
                                  backgroundColor: palette.surfaceStrong,
                                  borderColor: palette.border,
                                  borderStyle: 'solid',
                                  borderWidth: `${palette.lineWidth ?? 1}px`,
                                  color: palette.text,
                                  opacity: 0.88,
                                }}
                              >
                                {placeholderText ?? ''}
                              </div>
                              {field.type === 'select' && Array.isArray(displayOptions) && (
                                <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: hexToRGBA(palette.text, 0.75) }}>
                                  {displayOptions.map((option) => (
                                    <span
                                      key={`${field.id}-${option}`}
                                      className="rounded-full px-2 py-0.5 font-medium"
                                      style={{
                                        backgroundColor: hexToRGBA(palette.surface, 0.6),
                                        borderColor: palette.border,
                                        borderStyle: 'solid',
                                        borderWidth: `${palette.lineWidth ?? 1}px`,
                                        color: palette.text,
                                      }}
                                    >
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    <div className="flex" style={{ justifyContent: theme.heroButtonAlignment || 'center' }}>
                      <div
                        className="px-6 py-2 font-medium text-white shadow-lg"
                        style={{
                          backgroundColor: theme.heroButtonColor,
                          borderRadius: `${theme.heroButtonRadius ?? 12}px`,
                        }}
                      >
                        {previewHeroButtonText}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botões de ação */}
            <div className="flex gap-3 justify-end mt-4">
              <Button
                variant="outline"
                onClick={handlePreview}
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || isUploadingLogo}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>

          </TabsContent>

          <TabsContent value="refunds">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <Card className="shadow-lg border-2 border-emerald-200/50 dark:border-emerald-800/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
                        <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl text-foreground">
                          URL do portal de reembolsos
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Link compartilhável para solicitações de reembolso
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {refundPublicUrl ? (
                      <>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input value={refundPublicUrl} readOnly className="font-mono text-sm" />
                          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(refundPublicUrl)}>
                            <Copy className="mr-2 h-4 w-4" /> Copiar
                          </Button>
                        </div>
                        <Badge variant="outline">Slug: {refundPublicUrl.split('/').pop()}</Badge>
                      </>
                    ) : (
                      <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-900/20">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          URL ainda não disponível
                        </p>
                        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                          Salve as configurações do formulário para gerar um link público único e seguro.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-teal-200/50 dark:border-teal-800/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex-shrink-0">
                        <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl text-foreground">
                          Cabeçalho do formulário de reembolsos
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Personalize título, descrição e botão do portal de reembolsos
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" className="flex items-center gap-2 px-3 flex-shrink-0" onClick={() => setIsRefundHeroModalOpen(true)}>
                        <Edit2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="shadow-lg border-2 border-cyan-200/50 dark:border-cyan-800/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex-shrink-0">
                        <List className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl text-foreground">
                          Campos do formulário de reembolsos
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Arraste os campos para reordenar ou clique no ícone de edição para personalizar
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndRefund}>
                      <SortableContext items={refundFormFields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {refundFormFields.map((field) => (
                            <SortableFieldItem
                              key={field.id}
                              field={field}
                              onSave={handleSaveRefundField}
                              onDelete={() => handleDeleteRefundField(field.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    <div className="flex justify-center">
                      <Button size="sm" onClick={handleAddRefundField}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar campo
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Configurações de Reembolso */}
                <RefundConfigSection
                  config={refundConfig}
                  onChange={handleRefundConfigChange}
                />

                <Card className="shadow-lg border-2 border-violet-200/50 dark:border-violet-800/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex-shrink-0">
                        <Palette className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl text-foreground">
                          Personalização visual
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Customize cores, logo e aparência do portal de reembolsos
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Logo da loja</Label>
                      <div className="mt-3 space-y-4">
                        {refundLogoPreview && (
                          <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/60 p-4">
                            <img src={refundLogoPreview} alt="Preview da logo" className="h-16 w-auto" />
                            <Button variant="outline" size="sm" onClick={() => { setRefundLogoPreview(null); setRefundLogoFile(null); setRefundTheme((prev) => ({ ...prev, logoUrl: undefined })); }}>
                              Remover
                            </Button>
                          </div>
                        )}
                        <div className="rounded-lg border-2 border-dashed border-border/50 p-6 text-center">
                          <input id="refund-logo-upload" type="file" accept="image/*" onChange={handleRefundLogoUpload} className="hidden" />
                          <label htmlFor="refund-logo-upload" className="flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground">
                            <Upload className="h-6 w-6" /> Clique para enviar logo (PNG, JPG ou SVG)
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground">Logo para tema claro (opcional)</Label>
                      <p className="text-xs text-muted-foreground mt-1">Esta logo será usada quando o fundo for claro</p>
                      <div className="mt-3 space-y-4">
                        {refundLogoDarkPreview && (
                          <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/60 p-4">
                            <img src={refundLogoDarkPreview} alt="Preview da logo escura" className="h-16 w-auto" />
                            <Button variant="outline" size="sm" onClick={() => { setRefundLogoDarkPreview(null); setRefundLogoDarkFile(null); setRefundTheme((prev) => ({ ...prev, logoDarkUrl: undefined })); }}>
                              Remover
                            </Button>
                          </div>
                        )}
                        <div className="rounded-lg border-2 border-dashed border-border/50 p-6 text-center">
                          <input id="refund-logo-dark-upload" type="file" accept="image/*" onChange={handleRefundLogoDarkUpload} className="hidden" />
                          <label htmlFor="refund-logo-dark-upload" className="flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground">
                            <Upload className="h-6 w-6" /> Clique para enviar logo escura (PNG, JPG ou SVG)
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {(
                        [
                          { key: 'primaryColor', label: 'Cor primária' },
                          { key: 'secondaryColor', label: 'Cor secundária' },
                          { key: 'backgroundColor', label: 'Cor de fundo' },
                          { key: 'textColor', label: 'Cor do texto' },
                          { key: 'heroButtonColor', label: 'Cor do botão' },
                        ] as const
                      ).map(({ key, label }) => (
                        <div key={key}>
                          <Label className="text-sm font-medium text-foreground">{label}</Label>
                          <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                            <input
                              type="color"
                              value={refundTheme[key] || refundTheme.primaryColor}
                              onChange={(e) => {
                                const sanitized = sanitizeColor(e.target.value);
                                setRefundTheme((prev) => ({ ...prev, [key]: sanitized }));
                                if (key === 'heroButtonColor') {
                                  setRefundHeroDraft((prev) => ({ ...prev, buttonColor: sanitized }));
                                }
                              }}
                              className="h-9 w-full cursor-pointer rounded border border-border bg-background"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground">Espessura das linhas</Label>
                      <div className="mt-2 space-y-2">
                        <Slider
                          value={[refundTheme.lineWidth ?? 1]}
                          max={6}
                          min={1}
                          step={1}
                          onValueChange={(value) => setRefundTheme((prev) => ({ ...prev, lineWidth: value[0] }))}
                        />
                        <p className="text-xs text-muted-foreground">{refundTheme.lineWidth ?? 1}px</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="sticky top-6 shadow-lg border-2 border-amber-200/50 dark:border-amber-800/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                          <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg sm:text-xl text-foreground">
                            Preview do formulário de reembolsos
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            Visualize as mudanças instantaneamente
                          </p>
                        </div>
                      </div>
                      {hasLanguageOptions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                              role="button"
                              tabIndex={0}
                            >
                              {selectedRefundLanguage?.flag && <span>{selectedRefundLanguage.flag}</span>}
                              <span>{selectedRefundLanguage?.name ?? 'Idioma'}</span>
                              <ChevronDown className="h-3 w-3 opacity-40" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 rounded-lg border border-border/40 bg-card/95 p-1 shadow-lg backdrop-blur"
                          >
                            <DropdownMenuRadioGroup
                              value={refundsLanguage}
                              onValueChange={(value) => value && setRefundsLanguage(value)}
                            >
                              {languageOptions.map((lang) => (
                                <DropdownMenuRadioItem
                                  key={lang.code}
                                  value={lang.code}
                                  className="w-full px-2 py-1.5"
                                >
                                  <span className="text-base leading-none">{lang.flag}</span>
                                  <span className="flex-1">{lang.name}</span>
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="rounded-xl border bg-background"
                      style={{
                        backgroundColor: refundPalette.surface,
                        borderColor: refundPalette.border,
                        borderWidth: `${refundPalette.lineWidth ?? 1}px`,
                        color: refundPalette.text,
                      }}
                    >
                      <div
                        className="space-y-6 p-8"
                        style={{ backgroundColor: refundPalette.background, color: refundPalette.text }}
                      >
                        <div className="space-y-3 text-center">
                          {refundTheme.logoUrl && (
                            <div className="flex justify-center">
                              <img src={refundTheme.logoUrl} alt="Logo" className="h-12 w-auto" />
                            </div>
                          )}
                          <div>
                            <h2 className="text-2xl font-semibold" style={{ color: refundTheme.primaryColor }}>
                              {refundTheme.heroTitle || 'Reembolsos'}
                            </h2>
                            <p className="text-sm opacity-70">{refundTheme.heroSubtitle}</p>
                          </div>
                          <p className="text-sm opacity-80">{refundTheme.heroDescription}</p>
                        </div>

                        <div className="space-y-3">
                          {refundFormFields.map((field) => (
                            <div key={field.id} className="space-y-1.5">
                              <span className="text-sm font-medium">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                              </span>
                              <div
                                className="flex h-10 items-center rounded px-3 text-xs"
                                style={{
                                  backgroundColor: refundPalette.surfaceStrong,
                                  borderColor: refundPalette.border,
                                  borderStyle: 'solid',
                                  borderWidth: `${refundPalette.lineWidth ?? 1}px`,
                                  color: refundPalette.text,
                                  opacity: 0.88,
                                }}
                              >
                                {field.placeholder ?? ''}
                              </div>
                              {field.type === 'select' && Array.isArray(field.options) && (
                                <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: hexToRGBA(refundPalette.text, 0.75) }}>
                                  {field.options.map((option) => (
                                    <span
                                      key={`${field.id}-${option}`}
                                      className="rounded-full px-2 py-0.5 font-medium"
                                      style={{
                                        backgroundColor: hexToRGBA(refundPalette.surface, 0.6),
                                        borderColor: refundPalette.border,
                                        borderStyle: 'solid',
                                        borderWidth: `${refundPalette.lineWidth ?? 1}px`,
                                        color: refundPalette.text,
                                      }}
                                    >
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex" style={{ justifyContent: refundTheme.heroButtonAlignment || 'center' }}>
                          <div
                            className="px-6 py-2 font-medium text-white shadow-lg"
                            style={{
                              backgroundColor: refundTheme.heroButtonColor,
                              borderRadius: `${refundTheme.heroButtonRadius ?? 12}px`,
                            }}
                          >
                            {refundTheme.heroButtonText || 'Solicitar reembolso'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Botões de ação */}
                <div className="flex gap-3 justify-end mt-4">
                  <Button
                    variant="outline"
                    onClick={handleRefundPreview}
                    disabled={!refundPublicUrl}
                  >
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  <Button
                    onClick={handleRefundSave}
                    disabled={isRefundSaving || isRefundUploadingLogo}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isRefundSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>

          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isHeroModalOpen} onOpenChange={setIsHeroModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cabeçalho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label className="text-sm font-medium text-foreground">Título</Label>
                <Input
                  value={heroDraft.title}
                  onChange={(e) => setHeroDraft((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Subtítulo</Label>
                <Input
                  value={heroDraft.subtitle}
                  onChange={(e) => setHeroDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Descrição</Label>
                <Textarea
                  value={heroDraft.description}
                  onChange={(e) => setHeroDraft((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1.5 min-h-[90px]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Texto do botão</Label>
              <Input
                value={heroDraft.buttonText}
                onChange={(e) => setHeroDraft((prev) => ({ ...prev, buttonText: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-foreground">Alinhamento do botão</Label>
                <ToggleGroup
                  type="single"
                  value={heroDraft.buttonAlignment}
                  onValueChange={(value) => value && setHeroDraft((prev) => ({ ...prev, buttonAlignment: value as 'left' | 'center' | 'right' }))}
                  className="mt-2 flex justify-between rounded-xl border border-border bg-background/60 px-1 py-1"
                >
                  <ToggleGroupItem value="left" className="flex-1 rounded-lg text-xs font-semibold">
                    Esquerda
                  </ToggleGroupItem>
                  <ToggleGroupItem value="center" className="flex-1 rounded-lg text-xs font-semibold">
                    Centro
                  </ToggleGroupItem>
                  <ToggleGroupItem value="right" className="flex-1 rounded-lg text-xs font-semibold">
                    Direita
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Raio do botão</Label>
                <div className="mt-2 space-y-2">
                  <Slider value={[heroDraft.buttonRadius]} onValueChange={(value) => setHeroDraft((prev) => ({ ...prev, buttonRadius: value[0] }))} max={32} min={0} step={2} />
                  <p className="text-xs text-muted-foreground">{heroDraft.buttonRadius}px</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsHeroModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setTheme((prev) => ({
                    ...prev,
                    heroTitle: heroDraft.title,
                    heroSubtitle: heroDraft.subtitle,
                    heroDescription: heroDraft.description,
                    heroButtonText: heroDraft.buttonText,
                    heroButtonColor: heroDraft.buttonColor,
                    heroButtonAlignment: heroDraft.buttonAlignment,
                    heroButtonRadius: heroDraft.buttonRadius,
                  }));
                  setIsHeroModalOpen(false);
                  toast({ title: 'Cabeçalho atualizado', description: 'Pré-visualização sincronizada.' });
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRefundHeroModalOpen} onOpenChange={setIsRefundHeroModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cabeçalho do formulário de reembolsos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label className="text-sm font-medium text-foreground">Título</Label>
                <Input
                  value={refundHeroDraft.title}
                  onChange={(e) => setRefundHeroDraft((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Subtítulo</Label>
                <Input
                  value={refundHeroDraft.subtitle}
                  onChange={(e) => setRefundHeroDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Descrição</Label>
                <Textarea
                  value={refundHeroDraft.description}
                  onChange={(e) => setRefundHeroDraft((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1.5 min-h-[90px]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Texto do botão</Label>
              <Input
                value={refundHeroDraft.buttonText}
                onChange={(e) => setRefundHeroDraft((prev) => ({ ...prev, buttonText: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-foreground">Alinhamento do botão</Label>
                <ToggleGroup
                  type="single"
                  value={refundHeroDraft.buttonAlignment}
                  onValueChange={(value) => value && setRefundHeroDraft((prev) => ({ ...prev, buttonAlignment: value as 'left' | 'center' | 'right' }))}
                  className="mt-2 flex justify-between rounded-xl border border-border bg-background/60 px-1 py-1"
                >
                  <ToggleGroupItem value="left" className="flex-1 rounded-lg text-xs font-semibold">
                    Esquerda
                  </ToggleGroupItem>
                  <ToggleGroupItem value="center" className="flex-1 rounded-lg text-xs font-semibold">
                    Centro
                  </ToggleGroupItem>
                  <ToggleGroupItem value="right" className="flex-1 rounded-lg text-xs font-semibold">
                    Direita
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Raio do botão</Label>
                <div className="mt-2 space-y-2">
                  <Slider value={[refundHeroDraft.buttonRadius]} onValueChange={(value) => setRefundHeroDraft((prev) => ({ ...prev, buttonRadius: value[0] }))} max={32} min={0} step={2} />
                  <p className="text-xs text-muted-foreground">{refundHeroDraft.buttonRadius}px</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRefundHeroModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setRefundTheme((prev) => ({
                    ...prev,
                    heroTitle: refundHeroDraft.title,
                    heroSubtitle: refundHeroDraft.subtitle,
                    heroDescription: refundHeroDraft.description,
                    heroButtonText: refundHeroDraft.buttonText,
                    heroButtonColor: refundHeroDraft.buttonColor,
                    heroButtonAlignment: refundHeroDraft.buttonAlignment,
                    heroButtonRadius: refundHeroDraft.buttonRadius,
                  }));
                  setIsRefundHeroModalOpen(false);
                  toast({ title: 'Cabeçalho atualizado', description: 'Pré-visualização sincronizada.' });
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormularioPortal;
