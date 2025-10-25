import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Edit2,
  Eye,
  Globe,
  GripVertical,
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
  { id: 'type', type: 'select', label: 'Tipo de Solicitação', required: true, options: ['Troca', 'Devolução', 'Reembolso'] },
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

const FormularioPortal = () => {
  const { toast } = useToast();
  const { id: storeId } = useParams();
  const { store, isLoading } = useStore(storeId!);
  const { config: publicConfig, loading: configLoading, saveConfig, uploadLogo, getPublicUrl } = usePublicLinks(storeId!, 'returns');

  const [formFields, setFormFields] = useState<FormField[]>(defaultFields);
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false); // Prevent race conditions on save
  const [isUploadingLogo, setIsUploadingLogo] = useState(false); // Prevent concurrent logo uploads
  const languageOptions = useMemo(() => supportedLanguages.slice(), []);
  const hasLanguageOptions = languageOptions.length > 0;
  const [returnsLanguage, setReturnsLanguage] = useState('pt');
  const fallbackLanguage = languageOptions[0]?.code ?? 'pt';
  const selectedLanguage = useMemo(
    () => languageOptions.find((lang) => lang.code === returnsLanguage) ?? languageOptions[0],
    [languageOptions, returnsLanguage]
  );
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
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

  useEffect(() => {
    if (hasLanguageOptions && !languageOptions.some((lang) => lang.code === returnsLanguage)) {
      setReturnsLanguage(fallbackLanguage);
    }
  }, [hasLanguageOptions, languageOptions, returnsLanguage, fallbackLanguage]);

  const [heroDraft, setHeroDraft] = useState({
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
    if (!publicConfig) return;
    setConfig((prev) => ({
      ...prev,
      mensagem:
        (publicConfig.messages &&
          (publicConfig.messages as Record<string, string | undefined>)[returnsLanguage]) ??
        '',
    }));
  }, [publicConfig, returnsLanguage]);

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

  if (isLoading || configLoading || !store) {
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isUploadingLogo} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                  <Globe className="h-5 w-5" /> URL do portal público
                </CardTitle>
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

            <Card className="shadow-sm">
              <CardHeader className="space-y-1 pb-2 text-center">
                <CardTitle className="text-base font-semibold text-foreground">Cabeçalho do formulário</CardTitle>
                <p className="text-xs text-muted-foreground">Personalize título, descrição e botão do portal público.</p>
              </CardHeader>
              <CardContent className="flex justify-center pt-0 pb-4">
                <Button variant="secondary" size="sm" className="flex items-center gap-2 px-4" onClick={() => setIsHeroModalOpen(true)}>
                  <Edit2 className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="pb-4 text-center">
                <CardTitle className="text-center text-xl font-semibold text-foreground">
                  Campos do formulário
                </CardTitle>
                <p className="text-xs text-muted-foreground">Arraste os campos para reordenar ou clique no ícone de edição para personalizar.</p>
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

            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                  <Palette className="h-5 w-5" /> Personalização visual
                </CardTitle>
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
            <Card className="sticky top-6 shadow-lg">
              <CardHeader className="gap-2 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-xl text-foreground">Preview em tempo real</CardTitle>
                  {hasLanguageOptions && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-label="Selecionar idioma do formulário"
                        >
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="flex items-center gap-2 leading-none">
                            {selectedLanguage?.flag && <span className="leading-none">{selectedLanguage.flag}</span>}
                            <span>{selectedLanguage?.name ?? 'Idioma'}</span>
                          </span>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </Button>
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
                <p className="text-xs text-muted-foreground">Visualize como o cliente verá o formulário público.</p>
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
          </div>
        </div>
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
    </div>
  );
};

export default FormularioPortal;
