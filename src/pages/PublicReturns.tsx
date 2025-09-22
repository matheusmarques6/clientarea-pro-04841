import { useState } from 'react';
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
import { mockStores } from '@/lib/mockData';
import { getTranslation } from '@/lib/translations';
import { validateOrder, checkEligibility, generateProtocol, getStoreRules } from '@/lib/returnLogic';

const PublicReturns = () => {
  const { storeSlug } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'validation' | 'result' | 'success'>('form');
  const [validationResult, setValidationResult] = useState<any>(null);
  
  // Find store by slug
  const store = mockStores.find(s => 
    s.name.toLowerCase().replace(/\s+/g, '-') === storeSlug
  );
  
  const language = store?.returnsLanguage || 'pt';
  
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

  // Remove motivosComuns array - now using translations

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
    const newAnexos = formData.anexos.filter((_, i) => i !== index);
    setFormData({ ...formData, anexos: newAnexos });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.pedido || !formData.email || !formData.nome || !formData.tipo || !formData.motivo) {
      toast({
        title: t('requiredFields'),
        description: t('requiredFieldsDesc'),
        variant: "destructive"
      });
      return;
    }

    setStep('validation');

    // Simular processamento
    setTimeout(() => {
      // Validar pedido
      const orderValidation = validateOrder(formData.pedido, formData.email);
      
      if (!orderValidation.isValid) {
        toast({
          title: "Pedido não encontrado",
          description: orderValidation.error,
          variant: "destructive"
        });
        setStep('form');
        return;
      }

      // Verificar elegibilidade
      const storeRules = getStoreRules(store?.id || '1');
      const eligibility = checkEligibility(
        orderValidation.order,
        storeRules,
        formData.tipo as 'Troca' | 'Devolução',
        formData.motivo,
        formData.anexos.length > 0
      );

      const protocol = generateProtocol(formData.tipo as 'Troca' | 'Devolução');
      
      setValidationResult({
        order: orderValidation.order,
        eligibility,
        protocol,
        formData
      });

      setStep('result');
    }, 2000);
  };

  const handleNewRequest = () => {
    setStep('form');
    setValidationResult(null);
    setFormData({
      pedido: '',
      email: '',
      nome: '',
      tipo: '',
      motivo: '',
      observacoes: '',
      anexos: []
    });
  };

  // Tela de validação (processando)
  if (step === 'validation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <img 
              src={convertfyLogo} 
              alt="Convertfy" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('title')}
            </h1>
            <p className="text-muted-foreground">
              {t('subtitle')} {storeSlug?.replace(/-/g, ' ')}
            </p>
          </div>

          <Card className="glass-card text-center">
            <CardContent className="py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Processando Solicitação
              </h2>
              
              <p className="text-muted-foreground mb-8">
                Validando dados do pedido e verificando elegibilidade...
              </p>
              
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Tela de resultado (aprovado/negado)
  if (step === 'result' && validationResult) {
    const { order, eligibility, protocol, formData: requestData } = validationResult;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <img 
              src={convertfyLogo} 
              alt="Convertfy" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('title')}
            </h1>
            <p className="text-muted-foreground">
              {t('subtitle')} {storeSlug?.replace(/-/g, ' ')}
            </p>
          </div>

          <Card className="glass-card">
            <CardContent className="py-8">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                eligibility.isEligible 
                  ? eligibility.autoApprove 
                    ? 'bg-green-100' 
                    : 'bg-yellow-100'
                  : 'bg-red-100'
              }`}>
                {eligibility.isEligible ? (
                  eligibility.autoApprove ? (
                    <Check className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  )
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {eligibility.isEligible 
                    ? eligibility.autoApprove 
                      ? 'Solicitação Aprovada Automaticamente!'
                      : 'Solicitação em Análise'
                    : 'Solicitação Não Elegível'
                  }
                </h2>
                
                {eligibility.isEligible && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <p className="text-sm font-medium mb-2">Protocolo:</p>
                    <Badge variant="outline" className="text-base font-mono">
                      {protocol}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Detalhes do pedido */}
              <div className="bg-muted/30 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3">Dados do Pedido</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pedido:</span>
                    <span className="ml-2 font-medium">{order.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="ml-2 font-medium">{order.customerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="ml-2 font-medium">R$ {order.total.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-2 font-medium">{requestData.tipo}</span>
                  </div>
                </div>
              </div>

              {/* Próximos passos */}
              <div className="space-y-4">
                {eligibility.isEligible ? (
                  eligibility.autoApprove ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">✅ Próximos Passos:</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Você receberá um e-mail com a etiqueta de devolução</li>
                        <li>• Embale o produto com cuidado</li>
                        <li>• Cole a etiqueta no pacote e poste nos Correios</li>
                        <li>• Acompanhe o status pelo e-mail de confirmação</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800 mb-2">⏳ Em Análise:</h4>
                      <p className="text-sm text-yellow-700 mb-2">
                        Sua solicitação será analisada em até 2 dias úteis.
                      </p>
                      {eligibility.warnings.length > 0 && (
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {eligibility.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">❌ Motivos da Recusa:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {eligibility.reasons.map((reason, index) => (
                        <li key={index}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <Button 
                  variant="outline" 
                  onClick={handleNewRequest}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('newRequest')}
                </Button>
                <Button onClick={() => window.close()}>
                  {t('close')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>{t('poweredBy')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img 
              src={convertfyLogo} 
              alt="Convertfy" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('title')}
            </h1>
            <p className="text-muted-foreground">
              {t('subtitle')} {storeSlug?.replace(/-/g, ' ')}
            </p>
          </div>

          {/* Success Card */}
          <Card className="glass-card text-center">
            <CardContent className="py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {t('successTitle')}
              </h2>
              
              <div className="space-y-3 mb-8">
                <p className="text-muted-foreground">
                  {t('successDescription')}
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">{t('protocolTitle')}</p>
                  <Badge variant="outline" className="text-base font-mono">
                    RT-{Date.now().toString().slice(-6)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('protocolDescription')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleNewRequest}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('newRequest')}
                </Button>
                <Button onClick={() => window.close()}>
                  {t('close')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>{t('poweredBy')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-center bg-gradient-to-br from-background via-background to-muted/50">
      <div className="layout-container">{/* Container centralizado */}
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={convertfyLogo} 
            alt="Convertfy" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('subtitle')} {storeSlug?.replace(/-/g, ' ')}
          </p>
        </div>

        {/* Form Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Package className="h-5 w-5" />
              {t('formTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('formDescription')}
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados do Pedido */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">{t('orderDataTitle')}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pedido" className="text-foreground">{t('orderNumber')} *</Label>
                    <Input
                      id="pedido"
                      placeholder="#12345"
                      value={formData.pedido}
                      onChange={(e) => setFormData({ ...formData, pedido: e.target.value })}
                      required
                      className="text-foreground"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-foreground">{t('orderEmail')} *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nome" className="text-foreground">{t('fullName')} *</Label>
                  <Input
                    id="nome"
                    placeholder={t('fullName')}
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="text-foreground"
                  />
                </div>
              </div>

              {/* Tipo de Solicitação */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">{t('requestTypeTitle')}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo" className="text-foreground">{t('type')} *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                      required
                    >
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder={t('selectType')} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="Troca" className="text-foreground">{t('exchange')}</SelectItem>
                        <SelectItem value="Devolução" className="text-foreground">{t('return')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="motivo" className="text-foreground">{t('reason')} *</Label>
                    <Select
                      value={formData.motivo}
                      onValueChange={(value) => setFormData({ ...formData, motivo: value })}
                      required
                    >
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder={t('selectReason')} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {t('reasons').map((motivo: string, index: number) => (
                          <SelectItem key={index} value={motivo} className="text-foreground">
                            {motivo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes" className="text-foreground">{t('additionalComments')}</Label>
                <Textarea
                  id="observacoes"
                  placeholder={t('commentsPlaceholder')}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="min-h-[100px] text-foreground"
                />
              </div>

              {/* Upload de Arquivos */}
              <div className="space-y-4">
                <Label className="text-foreground">{t('attachments')}</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('attachmentsDescription')}
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {t('chooseFiles')}
                  </Button>
                </div>

                {/* Lista de Arquivos */}
                {formData.anexos.length > 0 && (
                  <div className="space-y-2">
                    {formData.anexos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                        <span className="text-sm font-medium truncate text-foreground">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          {t('remove')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Aviso */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 mb-1">{t('importantTitle')}</p>
                    <p className="text-blue-700">
                      {t('importantText')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg">
                {t('submitButton')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>{t('poweredBy')}</p>
        </div>
      </div>
    </div>
  );
};

export default PublicReturns;