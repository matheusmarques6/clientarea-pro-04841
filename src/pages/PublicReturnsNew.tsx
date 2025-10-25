import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Upload, Check, AlertCircle, FileText, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { translations } from '@/lib/translations';

interface Store {
  id: string;
  name: string;
  currency: string;
}

interface PublicLinkConfig {
  auto_rules: any;
  messages: any;
}

interface FormField {
  id: string;
  type: 'text' | 'email' | 'select' | 'textarea' | 'number' | 'phone';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

const defaultFormFields: FormField[] = [
  { id: 'order', type: 'text', label: 'Número do Pedido', placeholder: 'Ex: #1234', required: true },
  { id: 'email', type: 'email', label: 'E-mail do Pedido', placeholder: 'seu@email.com', required: true },
  { id: 'name', type: 'text', label: 'Nome Completo', placeholder: 'Seu nome', required: true },
  { id: 'type', type: 'select', label: 'Tipo de Solicitação', required: true, options: ['Troca', 'Devolução', 'Reembolso'] },
];

const reasonOptionMap = [
  { value: 'tamanho_incorreto', index: 0 },
  { value: 'cor_diferente', index: 1 },
  { value: 'defeito_fabricacao', index: 2 },
  { value: 'nao_gostei', index: 3 },
  { value: 'danificado_transporte', index: 4 },
  { value: 'mudanca_ideia', index: 5 },
  { value: 'produto_diferente', index: 6 },
  { value: 'outro', index: 7 },
];

const extraCopy: Record<
  string,
  {
    loadingTitle: string;
    loadingDescription: string;
    processingTitle: string;
    processingDescription: string;
    portalUnavailableTitle: string;
    portalUnavailableDescription: string;
    filesAddedDescription: (count: number) => string;
    genericErrorTitle: string;
    genericErrorDescription: string;
    trackStatus: string;
  }
> = {
  pt: {
    loadingTitle: 'Carregando',
    loadingDescription: 'Preparando seu portal de trocas e devoluções',
    processingTitle: 'Processando solicitação',
    processingDescription: 'Validando dados e gerando protocolo',
    portalUnavailableTitle: 'Portal indisponível',
    portalUnavailableDescription: 'O link pode estar inativo ou não existir. Verifique o endereço e tente novamente.',
    filesAddedDescription: (count) => `${count} arquivo(s) anexado(s) com sucesso`,
    genericErrorTitle: 'Erro',
    genericErrorDescription: 'Erro ao enviar solicitação. Tente novamente.',
    trackStatus: 'Acompanhar status',
  },
  en: {
    loadingTitle: 'Loading',
    loadingDescription: 'Preparing your returns and exchanges portal',
    processingTitle: 'Processing request',
    processingDescription: 'Validating data and generating protocol',
    portalUnavailableTitle: 'Portal unavailable',
    portalUnavailableDescription: 'The link may be inactive or missing. Check the address and try again.',
    filesAddedDescription: (count) => `${count} file(s) attached successfully`,
    genericErrorTitle: 'Error',
    genericErrorDescription: 'Failed to submit request. Please try again.',
    trackStatus: 'Track status',
  },
  es: {
    loadingTitle: 'Cargando',
    loadingDescription: 'Preparando su portal de cambios y devoluciones',
    processingTitle: 'Procesando solicitud',
    processingDescription: 'Validando datos y generando protocolo',
    portalUnavailableTitle: 'Portal no disponible',
    portalUnavailableDescription: 'El enlace puede estar inactivo o no existir. Verifique la dirección e intente nuevamente.',
    filesAddedDescription: (count) => `${count} archivo(s) adjuntado(s) con éxito`,
    genericErrorTitle: 'Error',
    genericErrorDescription: 'No se pudo enviar la solicitud. Inténtelo nuevamente.',
    trackStatus: 'Seguir estado',
  },
  fr: {
    loadingTitle: 'Chargement',
    loadingDescription: 'Préparation de votre portail d\'échanges et retours',
    processingTitle: 'Traitement de la demande',
    processingDescription: 'Validation des données et génération du protocole',
    portalUnavailableTitle: 'Portail indisponible',
    portalUnavailableDescription: 'Le lien peut être inactif ou inexistant. Vérifiez l\'adresse et réessayez.',
    filesAddedDescription: (count) => `${count} fichier(s) ajouté(s) avec succès`,
    genericErrorTitle: 'Erreur',
    genericErrorDescription: 'Échec de l\'envoi de la demande. Veuillez réessayer.',
    trackStatus: 'Suivre le statut',
  },
  de: {
    loadingTitle: 'Wird geladen',
    loadingDescription: 'Ihr Portal für Umtausch und Rückgabe wird vorbereitet',
    processingTitle: 'Antrag wird verarbeitet',
    processingDescription: 'Daten werden geprüft und Protokoll wird erstellt',
    portalUnavailableTitle: 'Portal nicht verfügbar',
    portalUnavailableDescription: 'Der Link ist möglicherweise inaktiv oder existiert nicht. Prüfen Sie die Adresse und versuchen Sie es erneut.',
    filesAddedDescription: (count) => `${count} Datei(en) erfolgreich hinzugefügt`,
    genericErrorTitle: 'Fehler',
    genericErrorDescription: 'Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
    trackStatus: 'Status verfolgen',
  },
};

const hexToRGBA = (hex: string, alpha = 1) => {
  if (!hex) return `rgba(17, 23, 39, ${alpha})`;
  const value = hex.replace('#', '');
  if (value.length !== 3 && value.length !== 6) {
    return `rgba(17, 23, 39, ${alpha})`;
  }
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const PublicReturnsNew = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'validation' | 'success'>('form');
  const [store, setStore] = useState<Store | null>(null);
  const [config, setConfig] = useState<PublicLinkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [theme, setTheme] = useState<any>(null);
  const [language, setLanguage] = useState('pt');
  
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedReason, setSelectedReason] = useState('');
  const [comments, setComments] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const translation = useMemo(
    () => translations.returns[language as keyof typeof translations.returns] ?? translations.returns.pt,
    [language]
  );
  const extra = useMemo(() => extraCopy[language] ?? extraCopy.pt, [language]);
  const formFields = useMemo<FormField[]>(() => {
    const customFields = (config?.auto_rules?.fields as FormField[] | undefined)?.map((field) => {
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

    if (customFields && customFields.length > 0) {
      return customFields;
    }

    return defaultFormFields;
  }, [config?.auto_rules?.fields]);
  const reasonOptions = useMemo(
    () =>
      reasonOptionMap
        .filter((option) => translation.reasons[option.index])
        .map((option) => ({
          value: option.value,
          label: translation.reasons[option.index],
        })),
    [translation.reasons]
  );
  const pageBackground = theme?.backgroundColor || '#0f172a';
  const pageText = theme?.textColor || '#f9fafb';
  const surfaceColor = useMemo(() => hexToRGBA(pageBackground, 0.9), [pageBackground]);
  const inputSurface = useMemo(() => hexToRGBA(pageBackground, 0.75), [pageBackground]);
  const borderColor = useMemo(() => hexToRGBA(pageText, 0.15), [pageText]);
  const lineWidth = Math.max(1, Math.min(6, theme?.lineWidth ?? 1));

  // Fetch store and config by slug
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        
        const { data: linkData, error: linkError } = await supabase
          .from('public_links')
          .select(`
            auto_rules,
            messages,
            store_id,
            stores!inner(id, name, currency)
          `)
          .eq('slug', slug)
          .eq('type', 'returns')
          .eq('enabled', true)
          .single();

        if (linkError || !linkData) {
          throw new Error('Link não encontrado ou inativo');
        }

        setStore(linkData.stores as Store);
        setConfig({
          auto_rules: linkData.auto_rules as any,
          messages: linkData.messages as any
        });
        
        // Extract theme and language from auto_rules
        const rules = linkData.auto_rules as any;
        if (rules?.theme) {
          setTheme(rules.theme);
        }
        if (rules?.language) {
          setLanguage(rules.language);
        }
      } catch (err: any) {
        console.error('Error fetching store data:', err);
        toast({
          title: extra.genericErrorTitle,
          description: extra.portalUnavailableDescription,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchStoreData();
    }
  }, [slug, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + attachments.length > 5) {
      toast({
        title: translation.limitExceeded,
        description: translation.limitExceededDesc,
        variant: "destructive"
      });
      return;
    }
    setAttachments((prev) => [...prev, ...files]);
    toast({
      title: translation.attachments,
      description: extra.filesAddedDescription(files.length),
    });
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingRequired = formFields.filter((field) => field.required && !formValues[field.id]?.trim());

    if (missingRequired.length > 0 || !selectedReason) {
      toast({
        title: translation.requiredFields,
        description: translation.requiredFieldsDesc,
        variant: "destructive"
      });
      return;
    }

    const orderValue = formValues.order ?? '';
    const emailValue = formValues.email ?? '';
    const nameValue = formValues.name ?? '';
    const typeValue = formValues.type ?? '';

    // Map Portuguese type values to database enum values
    const typeMap: Record<string, string> = {
      'Troca': 'exchange',
      'Devolução': 'return',
      'Reembolso': 'return',
      'exchange': 'exchange',
      'return': 'return'
    };
    const dbType = typeMap[typeValue] || 'return';

    setStep('validation');

    setTimeout(async () => {
      try {
        const rules = config?.auto_rules || {};
        // Generate unique protocol using UUID (first 8 chars are sufficient and collision-free)
        const protocol = `RET-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

        const { error } = await supabase
          .from('returns')
          .insert({
            store_id: store?.id,
            order_code: orderValue,
            customer_email: emailValue,
            customer_name: nameValue,
            type: dbType,
            reason: selectedReason,
            notes: comments,
            status: 'new',
            origin: 'public'
          });

        if (error) throw error;

        setValidationResult({
          approved: rules.aprovarAuto,
          protocol,
          message: config?.messages?.[language] || config?.messages?.pt || translation.successDescription,
          rules,
        });

        setStep('success');

        toast({
          title: translation.requestSent,
          description: `${translation.protocolTitle} ${protocol}`,
        });
      } catch (error) {
        console.error('Error submitting return:', error);
        toast({
          title: extra.genericErrorTitle,
          description: extra.genericErrorDescription,
          variant: "destructive"
        });
        setStep('form');
      }
    }, 2000);
  };

  const resetForm = () => {
    setFormValues((prev) => {
      const next: Record<string, string> = {};
      formFields.forEach((field) => {
        next[field.id] = '';
      });
      return next;
    });
    setSelectedReason('');
    setComments('');
    setAttachments([]);
    setStep('form');
    setValidationResult(null);
  };

  useEffect(() => {
    setFormValues((prev) => {
      const next: Record<string, string> = {};
      formFields.forEach((field) => {
        next[field.id] = prev[field.id] ?? '';
      });
      return next;
    });
  }, [formFields]);

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ backgroundColor: pageBackground, color: pageText }}
      >
        <Card
          className="w-full max-w-sm border shadow-sm"
          style={{ backgroundColor: surfaceColor, borderColor, color: pageText, borderWidth: `${lineWidth}px` }}
        >
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative mx-auto w-16 h-16">
              <div 
                className="animate-spin rounded-full h-16 w-16 border-2 border-t-4"
                style={{ 
                  borderColor: `${theme?.primaryColor || '#3b82f6'}20`,
                  borderTopColor: theme?.primaryColor || '#3b82f6'
                }}
              ></div>
              <Package 
                className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                style={{ color: theme?.primaryColor || '#3b82f6' }}
              />
            </div>
            <div className="space-y-2">
              <h3 
                className="text-lg font-medium"
                style={{ color: pageText }}
              >
                {extra.loadingTitle}
              </h3>
              <p 
                className="text-sm opacity-70"
                style={{ color: hexToRGBA(pageText, 0.65) }}
              >
                {extra.loadingDescription}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (!store || !config) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ backgroundColor: pageBackground, color: pageText }}
      >
        <Card
          className="w-full max-w-sm border shadow-sm"
          style={{ backgroundColor: surfaceColor, borderColor, color: pageText, borderWidth: `${lineWidth}px` }}
        >
          <CardContent className="p-8 text-center space-y-6">
            <div className="rounded-full h-16 w-16 bg-destructive/5 border border-destructive/20 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-medium" style={{ color: pageText }}>{extra.portalUnavailableTitle}</h2>
              <p className="text-sm leading-relaxed" style={{ color: hexToRGBA(pageText, 0.65) }}>
                {extra.portalUnavailableDescription}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validation step
  if (step === 'validation') {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ backgroundColor: pageBackground, color: pageText }}
      >
        <Card
          className="w-full max-w-md border shadow-sm"
          style={{ backgroundColor: surfaceColor, borderColor, borderWidth: `${lineWidth}px`, color: pageText }}
        >
          <CardContent className="p-8 text-center space-y-8">
            <div className="relative mx-auto w-20 h-20">
              <div 
                className="animate-spin rounded-full h-20 w-20 border-2 border-t-4"
                style={{ 
                  borderColor: `${theme?.primaryColor || '#3b82f6'}20`,
                  borderTopColor: theme?.primaryColor || '#3b82f6'
                }}
              ></div>
              <CheckCircle 
                className="h-8 w-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                style={{ color: theme?.primaryColor || '#3b82f6' }}
              />
            </div>
            <div className="space-y-3">
              <h3 
                className="text-xl font-medium"
                style={{ color: pageText }}
              >
                {extra.processingTitle}
              </h3>
              <p 
                className="text-sm opacity-70"
                style={{ color: hexToRGBA(pageText, 0.65) }}
              >
                {extra.processingDescription}
              </p>
            </div>
            <Progress value={75} className="w-full h-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    const isApproved = validationResult?.approved;
    
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ backgroundColor: pageBackground, color: pageText }}
      >
        <Card
          className="w-full max-w-lg border shadow-sm"
          style={{ backgroundColor: surfaceColor, borderColor, borderWidth: `${lineWidth}px`, color: pageText }}
        >
          <CardContent className="p-8 text-center space-y-8">
            <div className={`mx-auto rounded-full h-20 w-20 border flex items-center justify-center ${
              isApproved 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              {isApproved ? <Check className="h-10 w-10" /> : <Clock className="h-10 w-10" />}
            </div>
            
            <div className="space-y-3">
              <h2 
                className="text-2xl font-medium"
                style={{ color: pageText }}
              >
                {translation.successTitle}
              </h2>
              <p 
                className="leading-relaxed opacity-80"
                style={{ color: hexToRGBA(pageText, 0.7) }}
              >
                {validationResult?.message || translation.successDescription}
              </p>
              <p 
                className="text-sm opacity-70"
                style={{ color: hexToRGBA(pageText, 0.6) }}
              >
                {translation.protocolDescription}
              </p>
            </div>

            <div 
              className="border rounded-xl p-6"
              style={{ 
                backgroundColor: hexToRGBA(theme?.primaryColor || '#3b82f6', 0.12),
                borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : borderColor,
                borderWidth: `${lineWidth}px`
              }}
            >
              <p 
                className="text-sm font-medium mb-2 opacity-70"
                style={{ color: hexToRGBA(pageText, 0.65) }}
              >
                {translation.protocolTitle}
              </p>
              <p 
                className="text-3xl font-mono font-semibold tracking-wider"
                style={{ color: theme?.primaryColor || '#3b82f6' }}
              >
                {validationResult?.protocol}
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <Button onClick={resetForm} variant="outline" className="h-11 min-w-[180px]">
                {translation.newRequest}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate dynamic styles based on theme
  const getThemeStyles = () => {
    if (!theme) return {};

    return {
      '--theme-primary': theme.primaryColor || '#3b82f6',
      '--theme-secondary': theme.secondaryColor || '#1e40af',
      '--theme-background': pageBackground,
      '--theme-text': pageText,
    } as React.CSSProperties;
  };

  // Main form - Professional and clean design with dynamic theming
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 transition-colors"
      style={{
        backgroundColor: pageBackground,
        color: pageText,
        ...getThemeStyles(),
      }}
    >
      <div className="w-full max-w-[35%] min-w-[400px] max-w-2xl mx-auto">
        <Card
          className="border shadow-sm"
          style={{
            borderColor: theme?.primaryColor ? `${theme.primaryColor}20` : borderColor,
            backgroundColor: surfaceColor,
            color: pageText,
          }}
        >
          <CardHeader className="text-center space-y-6 pb-8">
            {theme?.logoUrl && (
              <div className="flex justify-center">
                <img 
                  src={theme.logoUrl} 
                  alt={store.name} 
                  className="h-16 w-auto object-contain" 
                />
              </div>
            )}
            <div className="space-y-2">
              <CardTitle 
                className="text-2xl font-medium"
                style={{ color: pageText }}
              >
                {translation.formTitle}
              </CardTitle>
              <p 
                className="text-sm opacity-70"
                style={{ color: hexToRGBA(pageText, 0.65) }}
              >
                {`${translation.subtitle} ${store.name}`}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {formFields.map((field) => {
                  const value = formValues[field.id] ?? '';
                  const isTextarea = field.type === 'textarea';
                  const isSelect = field.type === 'select';
                  const inputType =
                    field.type === 'phone' ? 'tel' : field.type === 'textarea' ? 'text' : field.type;
                  const baseStyles = {
                    borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : borderColor,
                    color: pageText,
                    backgroundColor: inputSurface,
                    borderWidth: `${lineWidth}px`,
                    borderStyle: 'solid',
                  };
                  let optionList = field.options ?? [];
                  if (field.id === 'type') {
                    const defaultOptions = ['Troca', 'Devolução', 'Reembolso'];
                    if (
                      optionList.length === defaultOptions.length &&
                      optionList.every((opt, idx) => opt.toLowerCase() === defaultOptions[idx].toLowerCase())
                    ) {
                      optionList = [
                        translation.exchange,
                        translation.return,
                        translation.refund ?? creditLabelMap[language] ?? creditLabelMap.pt,
                      ];
                    }
                  }

                  return (
                    <div key={field.id} className={isTextarea ? 'md:col-span-2 space-y-3' : 'space-y-3'}>
                      <Label
                        htmlFor={`field-${field.id}`}
                        className="text-sm font-medium"
                        style={{ color: pageText }}
                      >
                        {field.label}
                        {field.required ? ' *' : ''}
                      </Label>
                      {isSelect ? (
                        <Select
                          value={value || undefined}
                          onValueChange={(newValue) =>
                            setFormValues((prev) => ({ ...prev, [field.id]: newValue }))
                          }
                        >
                          <SelectTrigger
                            id={`field-${field.id}`}
                            className="h-11"
                            style={baseStyles}
                          >
                            <SelectValue placeholder={field.placeholder || translation.selectType} />
                          </SelectTrigger>
                          <SelectContent>
                            {optionList.map((option) => (
                              <SelectItem key={`${field.id}-${option}`} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : isTextarea ? (
                        <Textarea
                          id={`field-${field.id}`}
                          value={value}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          className="min-h-[100px] resize-none"
                          style={baseStyles}
                        />
                      ) : (
                        <Input
                          id={`field-${field.id}`}
                          type={inputType}
                          value={value}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          className="h-11"
                          style={baseStyles}
                          required={field.required}
                        />
                      )}
                    </div>
                  );
                })}

                <div className="space-y-3">
                  <Label
                    htmlFor="motivo"
                    className="text-sm font-medium"
                    style={{ color: pageText }}
                  >
                    {translation.reason} *
                  </Label>
                  <Select value={selectedReason} onValueChange={setSelectedReason}>
                    <SelectTrigger
                      className="h-11"
                      style={{
                        borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : borderColor,
                        color: pageText,
                        backgroundColor: inputSurface,
                        borderWidth: `${lineWidth}px`,
                        borderStyle: 'solid',
                      }}
                    >
                      <SelectValue placeholder={translation.selectReason} />
                    </SelectTrigger>
                    <SelectContent>
                      {reasonOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <Label
                    htmlFor="observacoes"
                    className="text-sm font-medium"
                    style={{ color: pageText }}
                  >
                    {translation.additionalComments}
                  </Label>
                  <Textarea
                    id="observacoes"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={translation.commentsPlaceholder}
                    className="min-h-[100px] resize-none"
                    style={{
                      borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : borderColor,
                      color: pageText,
                      backgroundColor: inputSurface,
                      borderWidth: `${lineWidth}px`,
                      borderStyle: 'solid',
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label 
                  className="text-sm font-medium"
                  style={{ color: pageText }}
                >
                  {translation.attachments}
                </Label>
                <div 
                  className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/30 transition-colors group"
                  style={{ 
                    borderColor: theme?.primaryColor ? `${theme.primaryColor}40` : borderColor,
                    backgroundColor: inputSurface,
                    color: pageText,
                    borderWidth: `${lineWidth}px`
                  }}
                >
                  <Upload 
                    className="h-8 w-8 mx-auto mb-3 group-hover:text-primary/70 transition-colors" 
                    style={{ color: theme?.primaryColor || pageText }}
                  />
                  <p 
                    className="text-sm mb-4 opacity-70"
                    style={{ color: hexToRGBA(pageText, 0.65) }}
                  >
                    {translation.attachmentsDescription}
                  </p>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="h-9"
                    style={{ 
                      borderColor: theme?.primaryColor || '#d1d5db',
                      color: theme?.primaryColor || pageText
                    }}
                  >
                    {translation.chooseFiles}
                  </Button>
                </div>
                
                {attachments.length > 0 && (
                  <div className="space-y-3">
                    {attachments.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                        style={{ 
                          backgroundColor: inputSurface,
                          borderColor,
                          borderWidth: `${lineWidth}px`
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <FileText 
                            className="h-5 w-5 flex-shrink-0" 
                            style={{ color: theme?.primaryColor || '#6b7280' }}
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className="text-sm font-medium truncate block"
                              style={{ color: theme?.textColor || '#1f2937' }}
                              title={decodeURIComponent(file.name)}
                            >
                              {(() => {
                                try {
                                  const decoded = decodeURIComponent(file.name);
                                  return decoded.length > 40
                                    ? decoded.substring(0, 40) + '...'
                                    : decoded;
                                } catch {
                                  return file.name.length > 40
                                    ? file.name.substring(0, 40) + '...'
                                    : file.name;
                                }
                              })()}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className="text-xs mt-1"
                              style={{ 
                                backgroundColor: `${theme?.primaryColor || '#3b82f6'}10`,
                                color: theme?.primaryColor || '#3b82f6'
                              }}
                            >
                              {(file.size / 1024 / 1024).toFixed(1)}MB
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium">
                {translation.submitButton}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicReturnsNew;
const creditLabelMap: Record<string, string> = {
  pt: 'Reembolso',
  en: 'Refund',
  es: 'Reembolso',
  fr: 'Remboursement',
  de: 'Rückerstattung',
};
