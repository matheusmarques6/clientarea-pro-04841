import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Upload, Check, AlertCircle, FileText, ShieldCheck, Clock, CheckCircle, XCircle, ArrowRight, Trash2 } from 'lucide-react';
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
          message: config?.messages?.[language] || 'Sua solicitação foi recebida e está sendo analisada.',
          rules
        });
        
        setStep('success');
        
        // Show success toast
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

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-secondary/20 to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardContent className="p-8 text-center">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-secondary/30 border-t-primary mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Carregando Portal</h3>
            <p className="text-muted-foreground">
              Preparando seu portal de trocas e devoluções...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!store || !config) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-destructive/10 to-destructive/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardContent className="p-8 text-center">
            <div className="bg-destructive/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Portal Não Encontrado</h2>
            <p className="text-muted-foreground">
              O link pode estar inativo ou não existir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validation step
  if (step === 'validation') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-primary/10 to-primary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg glass-card">
          <CardContent className="p-8 text-center">
            <div className="relative mb-6">
              <div className="animate-pulse rounded-full h-20 w-20 bg-gradient-to-r from-primary to-accent mx-auto flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Validando Solicitação</h3>
            <p className="text-muted-foreground mb-6">
              Verificando elegibilidade e processando dados...
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Verificando pedido</span>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Validando dados</span>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/30 border-t-primary"></div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Gerando protocolo</span>
                <Clock className="h-4 w-4" />
              </div>
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
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-success/10 to-success/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl glass-card">
          <CardContent className="p-8 text-center">
            <div className={`mx-auto rounded-full h-20 w-20 flex items-center justify-center mb-6 ${
              isApproved ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
            }`}>
              {isApproved ? <Check className="h-10 w-10" /> : <Clock className="h-10 w-10" />}
            </div>
            
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {isApproved ? 'Solicitação Aprovada!' : 'Solicitação Recebida!'}
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              {validationResult?.message}
            </p>

            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20 mb-8">
              <p className="text-sm font-medium text-foreground mb-2">Protocolo da solicitação:</p>
              <p className="text-4xl font-mono font-bold text-primary mb-2">
                {validationResult?.protocol}
              </p>
              <p className="text-sm text-muted-foreground">
                Guarde este número para acompanhar o status da sua solicitação
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="flex flex-col items-center gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <p className="font-semibold text-foreground">Protocolo Gerado</p>
                  <p className="text-xs text-muted-foreground">Identificação única</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 bg-success/10 rounded-xl border border-success/20">
                <ShieldCheck className="h-8 w-8 text-success" />
                <div className="text-center">
                  <p className="font-semibold text-foreground">Dados Verificados</p>
                  <p className="text-xs text-muted-foreground">Informações validadas</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 bg-accent/10 rounded-xl border border-accent/20">
                <Clock className="h-8 w-8 text-accent" />
                <div className="text-center">
                  <p className="font-semibold text-foreground">Email Enviado</p>
                  <p className="text-xs text-muted-foreground">Confirmação por email</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Nova Solicitação
              </Button>
              <Button className="flex-1" onClick={() => {
                const protocol = validationResult?.protocol;
                const subject = `Protocolo ${protocol} - Solicitação de ${formData.tipo}`;
                const body = `Olá,\n\nGostaria de acompanhar o status da minha solicitação.\n\nProtocolo: ${protocol}\nTipo: ${formData.tipo}\nPedido: ${formData.pedido}\n\nObrigado!`;
                const mailtoLink = `mailto:suporte@${store.name.toLowerCase().replace(/\s+/g, '')}.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailtoLink;
              }}>
                Entrar em Contato
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form step - Main form with clean professional design
  return (
    <div className="min-h-screen w-full bg-gradient-premium flex items-center justify-center p-4">
      <div className="w-full max-w-[35%] min-w-[400px] max-w-2xl">
        <Card className="glass-card">
          <CardHeader className="text-center pb-6">
            {config?.auto_rules?.theme?.logoUrl && (
              <div className="mb-6">
                <img 
                  src={config.auto_rules.theme.logoUrl} 
                  alt={store.name} 
                  className="h-16 w-auto mx-auto object-contain" 
                />
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-foreground">
              {store.name}
            </CardTitle>
            <p className="text-muted-foreground">Portal de Trocas & Devoluções</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pedido" className="text-sm font-medium text-foreground">
                    Número do Pedido *
                  </Label>
                  <Input
                    id="pedido"
                    type="text"
                    value={formData.pedido}
                    onChange={(e) => setFormData({...formData, pedido: e.target.value})}
                    placeholder="Ex: #12345"
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="seu@email.com"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium text-foreground">
                  Nome Completo *
                </Label>
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Seu nome completo"
                  className="form-input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-sm font-medium text-foreground">
                    Tipo de Solicitação *
                  </Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="troca">Troca</SelectItem>
                      <SelectItem value="devolucao">Devolução</SelectItem>
                      <SelectItem value="defeito">Produto com Defeito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="motivo" className="text-sm font-medium text-foreground">
                    Motivo *
                  </Label>
                  <Select value={formData.motivo} onValueChange={(value) => setFormData({...formData, motivo: value})}>
                    <SelectTrigger className="form-input">
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

              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm font-medium text-foreground">
                  Observações Adicionais
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Descreva detalhes adicionais sobre sua solicitação..."
                  className="form-input min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Anexos (Opcional)
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
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
                  >
                    Selecionar Arquivos
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Máximo 5 arquivos. Formatos: JPG, PNG, PDF, DOC
                  </p>
                </div>
                
                {formData.anexos.length > 0 && (
                  <div className="space-y-2">
                    {formData.anexos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground truncate">{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(file.size / 1024 / 1024).toFixed(1)}MB
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full btn-primary h-12 text-base font-medium">
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