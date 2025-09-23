import { useState, useEffect } from 'react';
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
  const [step, setStep] = useState<'form' | 'validation' | 'success'>('form');
  const [store, setStore] = useState<Store | null>(null);
  const [config, setConfig] = useState<PublicLinkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [theme, setTheme] = useState<any>(null);
  const [language, setLanguage] = useState('pt');
  
  const [formData, setFormData] = useState({
    pedido: '',
    email: '',
    nome: '',
    tipo: '',
    motivo: '',
    observacoes: '',
    anexos: [] as File[]
  });

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
        title: "Limite excedido",
        description: "Máximo de 5 arquivos permitidos",
        variant: "destructive"
      });
      return;
    }
    setFormData({ ...formData, anexos: [...formData.anexos, ...files] });
    toast({
      title: "Arquivo(s) adicionado(s)",
      description: `${files.length} arquivo(s) anexado(s) com sucesso`,
    });
  };

  const removeFile = (index: number) => {
    const newAnexos = formData.anexos.filter((_, i) => i !== index);
    setFormData({ ...formData, anexos: newAnexos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pedido || !formData.email || !formData.nome || !formData.tipo || !formData.motivo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setStep('validation');

    setTimeout(async () => {
      try {
        const rules = config?.auto_rules || {};
        const protocol = `RET-${Date.now().toString().slice(-6)}`;
        
        const { error } = await supabase
          .from('returns')
          .insert({
            store_id: store?.id,
            order_code: formData.pedido,
            customer_email: formData.email,
            customer_name: formData.nome,
            type: formData.tipo,
            reason: formData.motivo,
            notes: formData.observacoes,
            code: protocol,
            status: rules.aprovarAuto ? 'approved' : 'review',
            origin: 'public'
          });

        if (error) throw error;

        setValidationResult({
          approved: rules.aprovarAuto,
          protocol,
          message: config?.messages?.[language] || config?.messages?.pt || 'Sua solicitação foi recebida e está sendo analisada.',
          rules
        });
        
        setStep('success');
        
        toast({
          title: "Solicitação enviada!",
          description: `Protocolo ${protocol} gerado com sucesso`,
        });
      } catch (error) {
        console.error('Error submitting return:', error);
        toast({
          title: "Erro",
          description: "Erro ao enviar solicitação. Tente novamente.",
          variant: "destructive"
        });
        setStep('form');
      }
    }, 2000);
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

  // Loading state
  if (loading) {
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ backgroundColor: theme?.backgroundColor || '#ffffff' }}
      >
        <Card className="w-full max-w-sm border shadow-sm">
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
                style={{ color: theme?.textColor || '#1f2937' }}
              >
                Carregando
              </h3>
              <p 
                className="text-sm opacity-70"
                style={{ color: theme?.textColor || '#6b7280' }}
              >
                Preparando seu portal de trocas e devoluções
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
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-sm border border-border/50 bg-card shadow-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="rounded-full h-16 w-16 bg-destructive/5 border border-destructive/20 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-foreground">Portal Indisponível</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O link pode estar inativo ou não existir. Verifique o endereço e tente novamente.
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
        style={{ backgroundColor: theme?.backgroundColor || '#ffffff' }}
      >
        <Card className="w-full max-w-md border shadow-sm">
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
                style={{ color: theme?.textColor || '#1f2937' }}
              >
                Processando Solicitação
              </h3>
              <p 
                className="text-sm opacity-70"
                style={{ color: theme?.textColor || '#6b7280' }}
              >
                Validando dados e gerando protocolo
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
        style={{ backgroundColor: theme?.backgroundColor || '#ffffff' }}
      >
        <Card className="w-full max-w-lg border shadow-sm">
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
                style={{ color: theme?.textColor || '#1f2937' }}
              >
                {isApproved ? 'Solicitação Aprovada' : 'Solicitação Recebida'}
              </h2>
              <p 
                className="leading-relaxed opacity-80"
                style={{ color: theme?.textColor || '#6b7280' }}
              >
                {validationResult?.message}
              </p>
            </div>

            <div 
              className="border rounded-xl p-6"
              style={{ 
                backgroundColor: `${theme?.primaryColor || '#3b82f6'}10`,
                borderColor: `${theme?.primaryColor || '#3b82f6'}30`
              }}
            >
              <p 
                className="text-sm font-medium mb-2 opacity-70"
                style={{ color: theme?.textColor || '#6b7280' }}
              >
                Protocolo de Atendimento
              </p>
              <p 
                className="text-3xl font-mono font-semibold tracking-wider"
                style={{ color: theme?.primaryColor || '#3b82f6' }}
              >
                {validationResult?.protocol}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button onClick={resetForm} variant="outline" className="flex-1 h-11">
                Nova Solicitação
              </Button>
              <Button 
                className="flex-1 h-11"
                style={{
                  backgroundColor: theme?.primaryColor || '#3b82f6',
                  color: '#ffffff'
                }}
              >
                Acompanhar Status
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
      '--theme-background': theme.backgroundColor || '#ffffff',
      '--theme-text': theme.textColor || '#1f2937'
    } as React.CSSProperties;
  };

  // Main form - Professional and clean design with dynamic theming
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-6"
      style={{ 
        backgroundColor: theme?.backgroundColor || '#ffffff',
        color: theme?.textColor || '#1f2937',
        ...getThemeStyles()
      }}
    >
      <div className="w-full max-w-[35%] min-w-[400px] max-w-2xl mx-auto">
        <Card className="border shadow-sm" style={{ borderColor: theme?.primaryColor ? `${theme.primaryColor}20` : '#e5e7eb' }}>
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
                style={{ color: theme?.textColor || '#1f2937' }}
              >
                {store.name}
              </CardTitle>
              <p 
                className="text-sm opacity-70"
                style={{ color: theme?.textColor || '#6b7280' }}
              >
                Portal de Trocas & Devoluções
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label 
                    htmlFor="pedido" 
                    className="text-sm font-medium"
                    style={{ color: theme?.textColor || '#374151' }}
                  >
                    Número do Pedido *
                  </Label>
                  <Input
                    id="pedido"
                    type="text"
                    value={formData.pedido}
                    onChange={(e) => setFormData({...formData, pedido: e.target.value})}
                    placeholder="Ex: #12345"
                    className="h-11"
                    style={{ 
                      borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : '#d1d5db',
                      color: theme?.textColor || '#1f2937'
                    }}
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <Label 
                    htmlFor="email" 
                    className="text-sm font-medium"
                    style={{ color: theme?.textColor || '#374151' }}
                  >
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="seu@email.com"
                    className="h-11"
                    style={{ 
                      borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : '#d1d5db',
                      color: theme?.textColor || '#1f2937'
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label 
                  htmlFor="nome" 
                  className="text-sm font-medium"
                  style={{ color: theme?.textColor || '#374151' }}
                >
                  Nome Completo *
                </Label>
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Seu nome completo"
                  className="h-11"
                  style={{ 
                    borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : '#d1d5db',
                    color: theme?.textColor || '#1f2937'
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label 
                    htmlFor="tipo" 
                    className="text-sm font-medium"
                    style={{ color: theme?.textColor || '#374151' }}
                  >
                    Tipo de Solicitação *
                  </Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                    <SelectTrigger 
                      className="h-11"
                      style={{ 
                        borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : '#d1d5db',
                        color: theme?.textColor || '#1f2937'
                      }}
                    >
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="troca">Troca</SelectItem>
                      <SelectItem value="devolucao">Devolução</SelectItem>
                      <SelectItem value="defeito">Produto com Defeito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label 
                    htmlFor="motivo" 
                    className="text-sm font-medium"
                    style={{ color: theme?.textColor || '#374151' }}
                  >
                    Motivo *
                  </Label>
                  <Select value={formData.motivo} onValueChange={(value) => setFormData({...formData, motivo: value})}>
                    <SelectTrigger 
                      className="h-11"
                      style={{ 
                        borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : '#d1d5db',
                        color: theme?.textColor || '#1f2937'
                      }}
                    >
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tamanho_incorreto">Tamanho Incorreto</SelectItem>
                      <SelectItem value="nao_gostei">Não Gostei</SelectItem>
                      <SelectItem value="defeito_fabricacao">Defeito de Fabricação</SelectItem>
                      <SelectItem value="produto_diferente">Produto Diferente</SelectItem>
                      <SelectItem value="danificado_transporte">Danificado no Transporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label 
                  htmlFor="observacoes" 
                  className="text-sm font-medium"
                  style={{ color: theme?.textColor || '#374151' }}
                >
                  Observações Adicionais
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Descreva detalhes sobre sua solicitação..."
                  className="min-h-[100px] resize-none"
                  style={{ 
                    borderColor: theme?.primaryColor ? `${theme.primaryColor}30` : '#d1d5db',
                    color: theme?.textColor || '#1f2937'
                  }}
                />
              </div>

              <div className="space-y-3">
                <Label 
                  className="text-sm font-medium"
                  style={{ color: theme?.textColor || '#374151' }}
                >
                  Anexos (Opcional)
                </Label>
                <div 
                  className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/30 transition-colors group"
                  style={{ 
                    borderColor: theme?.primaryColor ? `${theme.primaryColor}40` : '#e5e7eb'
                  }}
                >
                  <Upload 
                    className="h-8 w-8 mx-auto mb-3 group-hover:text-primary/70 transition-colors" 
                    style={{ color: theme?.primaryColor || '#6b7280' }}
                  />
                  <p 
                    className="text-sm mb-4 opacity-70"
                    style={{ color: theme?.textColor || '#6b7280' }}
                  >
                    Arraste arquivos aqui ou clique para selecionar
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
                      color: theme?.primaryColor || '#374151'
                    }}
                  >
                    Selecionar Arquivos
                  </Button>
                </div>
                
                {formData.anexos.length > 0 && (
                  <div className="space-y-3">
                    {formData.anexos.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                        style={{ 
                          backgroundColor: `${theme?.primaryColor || '#3b82f6'}05`,
                          borderColor: `${theme?.primaryColor || '#3b82f6'}20`
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
                            >
                              {file.name}
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
                Enviar Solicitação
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicReturnsNew;