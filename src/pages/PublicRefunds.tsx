import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CreditCard, Upload, Check, AlertCircle, ArrowLeft } from 'lucide-react';
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

const PublicRefunds = () => {
  const { storeSlug } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'success'>('form');
  
  // Find store by slug
  const store = mockStores.find(s => 
    s.name.toLowerCase().replace(/\s+/g, '-') === storeSlug
  );
  
  const language = store?.refundsLanguage || 'pt';
  
  const [formData, setFormData] = useState({
    pedido: '',
    email: '',
    nome: '',
    valorReembolso: '',
    metodoReembolso: '',
    motivo: '',
    observacoes: '',
    anexos: [] as File[]
  });

  const t = (key: string): any => getTranslation('refunds', language, key);

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
    if (!formData.pedido || !formData.email || !formData.nome || !formData.valorReembolso || !formData.metodoReembolso || !formData.motivo) {
      toast({
        title: t('requiredFields'),
        description: t('requiredFieldsDesc'),
        variant: "destructive"
      });
      return;
    }

    // Simular envio
    setTimeout(() => {
      setStep('success');
      toast({
        title: t('requestSent'),
        description: t('requestSentDesc')
      });
    }, 1000);
  };

  const handleNewRequest = () => {
    setStep('form');
    setFormData({
      pedido: '',
      email: '',
      nome: '',
      valorReembolso: '',
      metodoReembolso: '',
      motivo: '',
      observacoes: '',
      anexos: []
    });
  };

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
                    RF-{Date.now().toString().slice(-6)}
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

        {/* Form Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="h-5 w-5" />
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

              {/* Informações do Reembolso */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">{t('refundInfoTitle')}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valorReembolso" className="text-foreground">{t('refundAmount')} *</Label>
                    <Input
                      id="valorReembolso"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.valorReembolso}
                      onChange={(e) => setFormData({ ...formData, valorReembolso: e.target.value })}
                      required
                      className="text-foreground"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="metodoReembolso" className="text-foreground">{t('refundMethod')} *</Label>
                    <Select
                      value={formData.metodoReembolso}
                      onValueChange={(value) => setFormData({ ...formData, metodoReembolso: value })}
                      required
                    >
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder={t('selectMethod')} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="card" className="text-foreground">{t('methods.card')}</SelectItem>
                        <SelectItem value="pix" className="text-foreground">{t('methods.pix')}</SelectItem>
                        <SelectItem value="boleto" className="text-foreground">{t('methods.boleto')}</SelectItem>
                        <SelectItem value="voucher" className="text-foreground">{t('methods.voucher')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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

export default PublicRefunds;