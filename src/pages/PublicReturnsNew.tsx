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
          message: config?.messages?.pt || 'Sua solicitação foi recebida e está sendo analisada.',
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
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-primary mx-auto"></div>
              <Package className="h-5 w-5 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Carregando</h3>
              <p className="text-sm text-muted-foreground">Preparando seu portal...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (!store || !config) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="rounded-full h-12 w-12 bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Portal Não Encontrado</h2>
              <p className="text-sm text-muted-foreground">
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
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-border bg-card">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-2 border-muted border-t-primary mx-auto"></div>
              <CheckCircle className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Processando Solicitação</h3>
              <p className="text-muted-foreground">Validando dados e gerando protocolo...</p>
            </div>
            <Progress value={75} className="w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    const isApproved = validationResult?.approved;
    
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl border-border bg-card">
          <CardContent className="p-8 text-center space-y-6">
            <div className={`mx-auto rounded-full h-16 w-16 flex items-center justify-center ${
              isApproved ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {isApproved ? <Check className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {isApproved ? 'Solicitação Aprovada!' : 'Solicitação Recebida!'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {validationResult?.message}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm font-medium text-foreground mb-1">Protocolo:</p>
              <p className="text-2xl font-mono font-bold text-primary">
                {validationResult?.protocol}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Nova Solicitação
              </Button>
              <Button className="flex-1">
                Acompanhar Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form - Clean and centered design
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="text-center space-y-2 pb-6">
          {config?.auto_rules?.theme?.logoUrl && (
            <div className="mb-4">
              <img 
                src={config.auto_rules.theme.logoUrl} 
                alt={store.name} 
                className="h-12 w-auto mx-auto object-contain" 
              />
            </div>
          )}
          <CardTitle className="text-xl font-bold text-foreground">
            {store.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Portal de Trocas & Devoluções
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pedido" className="text-sm font-medium">
                Número do Pedido *
              </Label>
              <Input
                id="pedido"
                type="text"
                value={formData.pedido}
                onChange={(e) => setFormData({...formData, pedido: e.target.value})}
                placeholder="Ex: #12345"
                className="w-full"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="seu@email.com"
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium">
                Nome Completo *
              </Label>
              <Input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                placeholder="Seu nome completo"
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo" className="text-sm font-medium">
                Tipo de Solicitação *
              </Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                <SelectTrigger className="w-full">
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
              <Label htmlFor="motivo" className="text-sm font-medium">
                Motivo *
              </Label>
              <Select value={formData.motivo} onValueChange={(value) => setFormData({...formData, motivo: value})}>
                <SelectTrigger className="w-full">
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

            <div className="space-y-2">
              <Label htmlFor="observacoes" className="text-sm font-medium">
                Observações Adicionais
              </Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Descreva detalhes sobre sua solicitação..."
                className="w-full min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Anexos (Opcional)
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-2">
                  Clique para selecionar arquivos
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
                  Selecionar
                </Button>
              </div>
              
              {formData.anexos.length > 0 && (
                <div className="space-y-2">
                  {formData.anexos.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{file.name}</span>
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

            <Button type="submit" className="w-full h-11 text-base font-medium">
              Enviar Solicitação
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicReturnsNew;