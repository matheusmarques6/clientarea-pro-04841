import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Upload, Check, AlertCircle, FileText, ShieldCheck, Clock } from 'lucide-react';
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
        
        // Set language from config
        setLanguage((linkData.auto_rules as any)?.language || 'pt');
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
  };

  const removeFile = (index: number) => {
    const newAnexos = formData.anexos.filter((_, i) => i !== index);
    setFormData({ ...formData, anexos: newAnexos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.pedido || !formData.email || !formData.nome || !formData.tipo || !formData.motivo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setStep('validation');

    // Simular processamento
    setTimeout(async () => {
      try {
        // Verificar elegibilidade baseada nas regras da loja
        const rules = config?.auto_rules || {};
        const isEligible = true; // Simplificado para demo
        
        const protocol = `RET-${Date.now().toString().slice(-6)}`;
        
        // Inserir solicitação no banco
        const { error } = await supabase
          .from('returns')
          .insert({
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
          message: config?.messages?.[language] || 'Sua solicitação foi recebida e está sendo analisada.',
          rules
        });
        
        setStep('success');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando portal...</p>
        </div>
      </div>
    );
  }

  if (!store || !config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h2 className="text-xl font-semibold">Portal não encontrado</h2>
              <p className="text-muted-foreground mt-2">
                O link pode estar inativo ou não existir.
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
              <div>
                <h3 className="text-lg font-semibold">Validando solicitação</h3>
                <p className="text-muted-foreground">
                  Verificando elegibilidade e processando dados...
                </p>
              </div>
              <Progress value={66} className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    const isApproved = validationResult?.approved;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-8">
            {config?.auto_rules?.theme?.logoUrl && (
              <img 
                src={config.auto_rules.theme.logoUrl} 
                alt={store.name} 
                className="h-16 w-auto mx-auto mb-4 object-contain" 
              />
            )}
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {store.name}
            </h1>
            <p className="text-muted-foreground text-lg">Portal de Trocas & Devoluções</p>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
            <CardContent className="pt-8 text-center space-y-6">
              <div className="space-y-4">
                <div className={`mx-auto rounded-full h-16 w-16 flex items-center justify-center ${
                  isApproved ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {isApproved ? <Check className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold">
                    {isApproved ? 'Solicitação Aprovada!' : 'Solicitação Recebida!'}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {validationResult?.message}
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Protocolo da solicitação:</p>
                <p className="text-2xl font-mono font-bold text-primary">
                  {validationResult?.protocol}
                </p>
                <p className="text-xs text-muted-foreground">
                  Guarde este número para acompanhar o status da sua solicitação
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 justify-center p-3 bg-background/50 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Protocolo gerado</span>
                </div>
                <div className="flex items-center gap-2 justify-center p-3 bg-background/50 rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span>Dados verificados</span>
                </div>
                <div className="flex items-center gap-2 justify-center p-3 bg-background/50 rounded-lg">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span>Email enviado</span>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📧 Próximos passos:</h3>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• Você receberá atualizações por email</li>
                    <li>• {isApproved ? 'Etiqueta de envio será enviada em breve' : 'Análise em até 2 dias úteis'}</li>
                    <li>• Use o protocolo para acompanhar o status</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={resetForm} variant="outline" className="flex-1">
                    Nova Solicitação
                  </Button>
                  <Button className="flex-1" onClick={() => {
                    const protocol = validationResult?.protocol;
                    const subject = `Protocolo ${protocol} - Solicitação de ${formData.tipo}`;
                    const body = `Olá,\n\nGostaria de acompanhar o status da minha solicitação.\n\nProtocolo: ${protocol}\nTipo: ${formData.tipo}\nPedido: ${formData.pedido}\n\nObrigado!`;
                    const mailtoLink = `mailto:contato@${store.name.toLowerCase().replace(/\s+/g, '')}.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoLink;
                  }}>
                    Entrar em Contato
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form step - Main form with professional design
  const theme = config?.auto_rules?.theme || {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af', 
    backgroundColor: '#ffffff',
    textColor: '#1f2937'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          {theme?.logoUrl && (
            <img 
              src={theme.logoUrl} 
              alt={store.name} 
              className="h-20 w-auto mx-auto mb-6 object-contain" 
            />
          )}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {store.name}
          </h1>
          <p className="text-muted-foreground text-xl">Portal de Trocas & Devoluções</p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Package className="h-6 w-6 text-primary" />
                  Solicitar Troca ou Devolução
                </CardTitle>
                <p className="text-muted-foreground">
                  Preencha os dados abaixo para solicitar a troca ou devolução do seu produto
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Order Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">📦 Dados do Pedido</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pedido">Número do Pedido *</Label>
                        <Input
                          id="pedido"
                          value={formData.pedido}
                          onChange={(e) => setFormData({ ...formData, pedido: e.target.value })}
                          placeholder="Ex: #12345"
                          className="bg-background/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail do Pedido *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          className="bg-background/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Seu nome completo"
                        className="bg-background/50"
                        required
                      />
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">🔄 Tipo de Solicitação</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo *</Label>
                        <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Troca">🔄 Troca</SelectItem>
                            <SelectItem value="Devolução">↩️ Devolução</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="motivo">Motivo *</Label>
                        <Select value={formData.motivo} onValueChange={(value) => setFormData({ ...formData, motivo: value })}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Selecione o motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tamanho incorreto">📏 Tamanho incorreto</SelectItem>
                            <SelectItem value="Cor diferente do esperado">🎨 Cor diferente do esperado</SelectItem>
                            <SelectItem value="Produto com defeito">⚠️ Produto com defeito</SelectItem>
                            <SelectItem value="Não gostei do produto">😐 Não gostei do produto</SelectItem>
                            <SelectItem value="Produto danificado na entrega">📦 Danificado na entrega</SelectItem>
                            <SelectItem value="Arrependimento da compra">🤔 Arrependimento da compra</SelectItem>
                            <SelectItem value="Produto diferente da descrição">📝 Diferente da descrição</SelectItem>
                            <SelectItem value="Outro motivo">❓ Outro motivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Comments */}
                  <div className="space-y-2">
                    <Label htmlFor="observacoes">💬 Observações Adicionais</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Descreva detalhadamente o problema ou motivo da solicitação..."
                      rows={4}
                      className="bg-background/50"
                    />
                  </div>

                  {/* File Upload */}
                  <div className="space-y-4">
                    <Label>📎 Anexos (Opcional)</Label>
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-6 hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block text-center">
                        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          Clique para adicionar fotos ou documentos
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG (máximo 5 arquivos)
                        </p>
                      </label>
                    </div>
                    
                    {formData.anexos.length > 0 && (
                      <div className="space-y-2">
                        {formData.anexos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
                            <span className="text-sm truncate">{file.name}</span>
                            <Button size="sm" variant="ghost" onClick={() => removeFile(index)}>
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-12 text-lg font-semibold"
                    disabled={!formData.pedido || !formData.email || !formData.nome || !formData.tipo || !formData.motivo}
                  >
                    🚀 Enviar Solicitação
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Information */}
          <div className="space-y-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  Informações Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Tempo de análise</p>
                      <p className="text-muted-foreground">Até 2 dias úteis</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Prazo para devolução</p>
                      <p className="text-muted-foreground">{config?.auto_rules?.janelaDias || 15} dias</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Acompanhamento</p>
                      <p className="text-muted-foreground">Via email e protocolo</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-blue-900">💡 Dica</h3>
                  <p className="text-sm text-blue-800">
                    Adicione fotos do produto para acelerar a análise da sua solicitação!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicReturnsNew;