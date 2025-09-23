import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Upload, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import convertfyLogo from '@/assets/convertfy-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { getTranslation } from '@/lib/translations';
import { validateOrder, checkEligibility, generateProtocol } from '@/lib/returnLogic';

interface Store {
  id: string;
  name: string;
  currency: string;
}

interface PublicLinkConfig {
  auto_rules: any;
  messages: any;
}

const PublicReturnsNew = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'validation' | 'result' | 'success'>('form');
  const [store, setStore] = useState<Store | null>(null);
  const [config, setConfig] = useState<PublicLinkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const language = 'pt'; // Default to Portuguese, can be made dynamic later
  
  const [formData, setFormData] = useState({
    pedido: '',
    email: '',
    nome: '',
    tipo: '',
    motivo: '',
    observacoes: '',
    anexos: [] as File[]
  });

  const t = (key: string): any => getTranslation('returns', language, key);

  // Fetch store and config by slug
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        
        // Get public link config by slug
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
      } catch (err: any) {
        console.error('Error fetching store data:', err);
        toast({
          title: "Erro",
          description: "Link não encontrado ou inativo",
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
    if (files.length + formData.anexos.length > 5) {
      toast({
        title: t('limitExceeded'),
        description: t('limitExceededDesc'),
        variant: "destructive"
      });
      return;
    }
    setFormData({ ...formData, anexos: [...formData.anexos, ...files] });
  };

  const removeFile = (index: number) => {
    const newFiles = formData.anexos.filter((_, i) => i !== index);
    setFormData({ ...formData, anexos: newFiles });
  };

  const handleSubmit = async () => {
    if (!store || !config) return;

    setStep('validation');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Validate order
      const orderValidation = validateOrder(formData.pedido, formData.email);
      
      if (!orderValidation.isValid) {
        setValidationResult({
          success: false,
          message: orderValidation.error || 'Pedido não encontrado'
        });
        setStep('result');
        return;
      }

      // Check eligibility
      const eligibilityResult = checkEligibility(
        orderValidation.order!,
        config.auto_rules as any,
        formData.tipo as 'Troca' | 'Devolução',
        formData.motivo,
        formData.anexos.length > 0
      );

      if (!eligibilityResult.isEligible) {
        setValidationResult({
          success: false,
          message: eligibilityResult.reasons?.[0] || 'Não elegível'
        });
        setStep('result');
        return;
      }

      // Create return request in database
      const protocol = generateProtocol(formData.tipo as 'Troca' | 'Devolução');
      
      const { error: insertError } = await supabase
        .from('returns')
        .insert({
          store_id: store.id,
          order_code: formData.pedido,
          customer_name: formData.nome,
          customer_email: formData.email,
          type: formData.tipo,
          reason: formData.motivo,
          notes: formData.observacoes,
          status: eligibilityResult.autoApprove ? 'approved' : 'review',
          origin: 'public',
          code: protocol
        });

      if (insertError) {
        throw insertError;
      }

      setValidationResult({
        success: true,
        protocol,
        autoApprove: eligibilityResult.autoApprove,
        message: eligibilityResult.autoApprove ? 
          'Solicitação aprovada automaticamente' : 
          'Solicitação recebida e em análise'
      });
      
      setStep('success');
    } catch (err: any) {
      console.error('Error processing return:', err);
      setValidationResult({
        success: false,
        message: 'Erro interno. Tente novamente mais tarde.'
      });
      setStep('result');
    }
  };

  const resetForm = () => {
    setFormData({
      pedido: '',
      email: '',
      nome: '',
      tipo: '',
      motivo: '',
      observacoes: '',
      anexos: []
    });
    setStep('form');
    setValidationResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!store || !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Link não encontrado</h1>
          <p className="text-muted-foreground">
            O link que você acessou não existe ou está inativo.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'validation') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Processando solicitação</h2>
          <p className="text-muted-foreground">
            Estamos validando seus dados e verificando a elegibilidade do pedido...
          </p>
        </div>
      </div>
    );
  }

  if (step === 'result' || step === 'success') {
    const isSuccess = validationResult?.success;
    
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          <div className="mb-6">
            <img src={convertfyLogo} alt="Convertfy" className="h-8 mb-4" />
            <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
            <p className="text-muted-foreground">Portal de Trocas & Devoluções</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {isSuccess ? (
                  <Check className="h-12 w-12 text-green-600" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-destructive" />
                )}
              </div>
              <CardTitle className={isSuccess ? "text-green-600" : "text-destructive"}>
                {isSuccess ? "Solicitação Enviada!" : "Solicitação Não Processada"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {validationResult?.message}
                </p>
                
                {isSuccess && validationResult?.protocol && (
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <p className="text-sm font-medium mb-2">Protocolo de Acompanhamento:</p>
                    <p className="text-lg font-mono font-bold">{validationResult.protocol}</p>
                  </div>
                )}

                {isSuccess && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <p className="text-sm text-green-800">
                      {config.messages.pt || "Sua solicitação foi recebida com sucesso."}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={resetForm} className="flex-1">
                  Nova Solicitação
                </Button>
                {isSuccess && (
                  <Button variant="outline" className="flex-1">
                    Acompanhar Status
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const theme = config?.auto_rules?.theme || {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af', 
    backgroundColor: '#ffffff',
    textColor: '#1f2937'
  };

  const dynamicStyles = {
    '--primary-color': theme.primaryColor,
    '--secondary-color': theme.secondaryColor,
    '--background-color': theme.backgroundColor,
    '--text-color': theme.textColor
  } as React.CSSProperties;

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        ...dynamicStyles
      }}
    >
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="mb-6 text-center">
          {theme.logoUrl && (
            <img src={theme.logoUrl} alt={store.name} className="h-16 w-auto mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-2xl font-bold" style={{ color: theme.textColor }}>{store.name}</h1>
          <p style={{ color: theme.textColor + 'cc' }}>Portal de Trocas & Devoluções</p>
        </div>

        <Card style={{ backgroundColor: theme.backgroundColor, borderColor: theme.primaryColor + '40' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: theme.textColor }}>
              <Package className="h-5 w-5" />
              {t('requestTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pedido" style={{ color: theme.textColor }}>{t('orderNumber')}</Label>
                <Input
                  id="pedido"
                  value={formData.pedido}
                  onChange={(e) => setFormData({ ...formData, pedido: e.target.value })}
                  placeholder={t('orderNumberPlaceholder')}
                  style={{ 
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.primaryColor + '60',
                    color: theme.textColor
                  }}
                />
              </div>
              <div>
                <Label htmlFor="email" style={{ color: theme.textColor }}>{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('emailPlaceholder')}
                  style={{ 
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.primaryColor + '60',
                    color: theme.textColor
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nome" style={{ color: theme.textColor }}>{t('name')}</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder={t('namePlaceholder')}
                style={{ 
                  backgroundColor: theme.backgroundColor,
                  borderColor: theme.primaryColor + '60',
                  color: theme.textColor
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo" style={{ color: theme.textColor }}>{t('requestType')}</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger style={{ 
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.primaryColor + '60',
                    color: theme.textColor
                  }}>
                    <SelectValue placeholder={t('selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Troca">{t('exchange')}</SelectItem>
                    <SelectItem value="Devolução">{t('return')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="motivo" style={{ color: theme.textColor }}>{t('reason')}</Label>
                <Select value={formData.motivo} onValueChange={(value) => setFormData({ ...formData, motivo: value })}>
                  <SelectTrigger style={{ 
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.primaryColor + '60',
                    color: theme.textColor
                  }}>
                    <SelectValue placeholder={t('selectReason')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Defeito">{t('defect')}</SelectItem>
                    <SelectItem value="Tamanho incorreto">{t('wrongSize')}</SelectItem>
                    <SelectItem value="Produto diferente">{t('wrongProduct')}</SelectItem>
                    <SelectItem value="Não gostei">{t('dontLike')}</SelectItem>
                    <SelectItem value="Outro">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes" style={{ color: theme.textColor }}>{t('additionalComments')}</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder={t('commentsPlaceholder')}
                rows={3}
                style={{ 
                  backgroundColor: theme.backgroundColor,
                  borderColor: theme.primaryColor + '60',
                  color: theme.textColor
                }}
              />
            </div>

            <div>
              <Label style={{ color: theme.textColor }}>{t('attachments')}</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-4"
                style={{ borderColor: theme.primaryColor + '40' }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer block text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: theme.textColor + 'aa' }} />
                  <p className="text-sm" style={{ color: theme.textColor + 'aa' }}>
                    {t('uploadDescription')}
                  </p>
                </label>
              </div>
              
              {formData.anexos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.anexos.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 rounded"
                      style={{ backgroundColor: theme.primaryColor + '10' }}
                    >
                      <span className="text-sm truncate" style={{ color: theme.textColor }}>{file.name}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeFile(index)}
                        style={{ color: theme.textColor }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={!formData.pedido || !formData.email || !formData.nome || !formData.tipo || !formData.motivo}
              style={{ 
                backgroundColor: theme.primaryColor,
                color: '#ffffff'
              }}
            >
              {t('submitRequest')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicReturnsNew;