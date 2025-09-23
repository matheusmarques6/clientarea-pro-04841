import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Upload, Check, AlertCircle, FileText, ShieldCheck, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Carregando Portal</h3>
                <p className="text-gray-600">
                  Preparando seu portal de trocas e devoluções...
                </p>
              </div>
              <Progress value={50} className="w-full h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!store || !config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="space-y-4">
              <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Portal Não Encontrado</h2>
                <p className="text-gray-600 mt-2">
                  O link pode estar inativo ou não existir.
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-left text-sm text-red-800">
                <p><strong>Possíveis causas:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Link desabilitado pela loja</li>
                  <li>URL incorreta ou expirada</li>
                  <li>Portal ainda não configurado</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validation step
  if (step === 'validation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-lg w-full mx-4 shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-8 text-center space-y-8">
            <div className="space-y-6">
              <div className="relative">
                <div className="animate-pulse rounded-full h-20 w-20 bg-gradient-to-r from-blue-400 to-purple-600 mx-auto flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Validando Solicitação</h3>
                <p className="text-gray-600 mt-2">
                  Verificando elegibilidade e processando dados...
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Verificando pedido</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Validando dados</span>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600"></div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Gerando protocolo</span>
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              
              <Progress value={75} className="w-full h-3" />
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            {config?.auto_rules?.theme?.logoUrl && (
              <div className="relative mb-6">
                <img 
                  src={config.auto_rules.theme.logoUrl} 
                  alt={store.name} 
                  className="h-20 w-auto mx-auto object-contain" 
                />
              </div>
            )}
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
              {store.name}
            </h1>
            <p className="text-gray-600 text-xl">Portal de Trocas & Devoluções</p>
            <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-500 mx-auto mt-4 rounded-full"></div>
          </div>

          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="pt-8 text-center space-y-8">
              <div className="space-y-6">
                <div className={`mx-auto rounded-full h-20 w-20 flex items-center justify-center shadow-lg ${
                  isApproved ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {isApproved ? <Check className="h-10 w-10" /> : <Clock className="h-10 w-10" />}
                </div>
                
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">
                    {isApproved ? '✅ Solicitação Aprovada!' : '🕐 Solicitação Recebida!'}
                  </h2>
                  <p className="text-gray-600 mt-3 text-lg">
                    {validationResult?.message}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-2">📋 Protocolo da solicitação:</p>
                <p className="text-4xl font-mono font-bold text-blue-600 mb-2">
                  {validationResult?.protocol}
                </p>
                <p className="text-sm text-gray-600">
                  Guarde este número para acompanhar o status da sua solicitação
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="text-center">
                    <p className="font-semibold text-blue-800">Protocolo Gerado</p>
                    <p className="text-xs text-blue-600">Identificação única</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                  <div className="text-center">
                    <p className="font-semibold text-green-800">Dados Verificados</p>
                    <p className="text-xs text-green-600">Informações validadas</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="text-center">
                    <p className="font-semibold text-orange-800">Email Enviado</p>
                    <p className="text-xs text-orange-600">Confirmação por email</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 text-left">
                  <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <ArrowRight className="h-5 w-5" />
                    📧 Próximos passos:
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      Você receberá atualizações por email sobre o andamento
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      {isApproved ? 'Etiqueta de envio será enviada em breve' : 'Análise será concluída em até 2 dias úteis'}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      Use o protocolo para acompanhar o status a qualquer momento
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      Mantenha o produto em boas condições até a coleta
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={resetForm} variant="outline" className="flex-1 h-12 text-base">
                    🔄 Nova Solicitação
                  </Button>
                  <Button className="flex-1 h-12 text-base" onClick={() => {
                    const protocol = validationResult?.protocol;
                    const subject = `Protocolo ${protocol} - Solicitação de ${formData.tipo}`;
                    const body = `Olá,\n\nGostaria de acompanhar o status da minha solicitação.\n\nProtocolo: ${protocol}\nTipo: ${formData.tipo}\nPedido: ${formData.pedido}\n\nObrigado!`;
                    const mailtoLink = `mailto:suporte@${store.name.toLowerCase().replace(/\s+/g, '')}.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoLink;
                  }}>
                    💬 Entrar em Contato
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          {theme?.logoUrl && (
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full blur-2xl opacity-30"></div>
              <img 
                src={theme.logoUrl} 
                alt={store.name} 
                className="relative h-24 w-auto mx-auto object-contain" 
              />
            </div>
          )}
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
            {store.name}
          </h1>
          <p className="text-gray-600 text-2xl mb-6">Portal de Trocas & Devoluções</p>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-600 mx-auto rounded-full"></div>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            Solicite a troca ou devolução do seu produto de forma rápida e segura
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Form */}
          <div className="xl:col-span-3">
            <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-3xl flex items-center gap-3 text-gray-800">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  Solicitar Troca ou Devolução
                </CardTitle>
                <p className="text-gray-600 text-lg mt-2">
                  Preencha os dados abaixo para iniciar sua solicitação
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Order Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-100 rounded-full p-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">📦 Dados do Pedido</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="pedido" className="text-sm font-semibold text-gray-700">
                          Número do Pedido *
                        </Label>
                        <Input
                          id="pedido"
                          value={formData.pedido}
                          onChange={(e) => setFormData({ ...formData, pedido: e.target.value })}
                          placeholder="Ex: #12345"
                          className="h-12 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                          E-mail do Pedido *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          className="h-12 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="text-sm font-semibold text-gray-700">
                        Nome Completo *
                      </Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Seu nome completo"
                        className="h-12 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-green-100 rounded-full p-2">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">🔄 Tipo de Solicitação</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="tipo" className="text-sm font-semibold text-gray-700">
                          Tipo *
                        </Label>
                        <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                          <SelectTrigger className="h-12 bg-gray-50 border-gray-200 focus:border-blue-500">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Troca">🔄 Troca por outro produto</SelectItem>
                            <SelectItem value="Devolução">↩️ Devolução com reembolso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="motivo" className="text-sm font-semibold text-gray-700">
                          Motivo *
                        </Label>
                        <Select value={formData.motivo} onValueChange={(value) => setFormData({ ...formData, motivo: value })}>
                          <SelectTrigger className="h-12 bg-gray-50 border-gray-200 focus:border-blue-500">
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
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-purple-100 rounded-full p-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <Label htmlFor="observacoes" className="text-xl font-bold text-gray-800">
                        💬 Observações Adicionais
                      </Label>
                    </div>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Descreva detalhadamente o problema ou motivo da solicitação. Quanto mais informações, mais rápida será a análise..."
                      rows={4}
                      className="bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* File Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-orange-100 rounded-full p-2">
                        <Upload className="h-5 w-5 text-orange-600" />
                      </div>
                      <Label className="text-xl font-bold text-gray-800">📎 Anexos (Opcional)</Label>
                    </div>
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 hover:border-blue-500 transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-50">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block text-center">
                        <div className="bg-blue-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                          <Upload className="h-8 w-8 text-blue-600" />
                        </div>
                        <p className="text-lg font-semibold text-gray-800 mb-2">
                          Clique para adicionar fotos ou documentos
                        </p>
                        <p className="text-sm text-gray-600">
                          PNG, JPG (máximo 5 arquivos) • Fotos aceleram a análise
                        </p>
                      </label>
                    </div>
                    
                    {formData.anexos.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700">
                          📎 Arquivos anexados ({formData.anexos.length}/5):
                        </p>
                        {formData.anexos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                              </Badge>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => removeFile(index)} className="text-red-600 hover:text-red-800">
                              ❌
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transform transition-all duration-200 hover:scale-105"
                    disabled={!formData.pedido || !formData.email || !formData.nome || !formData.tipo || !formData.motivo}
                  >
                    🚀 Enviar Solicitação
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Sidebar Information */}
          <div className="space-y-6">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                  ℹ️ Informações Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800">Tempo de análise</p>
                      <p className="text-blue-600">Até 2 dias úteis</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <Package className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800">Prazo para devolução</p>
                      <p className="text-green-600">{config?.auto_rules?.janelaDias || 15} dias</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <FileText className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-800">Acompanhamento</p>
                      <p className="text-orange-600">Via email e protocolo</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="bg-yellow-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="font-bold text-yellow-800">💡 Dica Importante</h3>
                  <p className="text-sm text-yellow-700">
                    Adicione fotos do produto para acelerar significativamente a análise da sua solicitação!
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="bg-green-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto">
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-bold text-green-800">🔒 Dados Seguros</h3>
                  <p className="text-sm text-green-700">
                    Suas informações são protegidas e utilizadas apenas para processar sua solicitação.
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