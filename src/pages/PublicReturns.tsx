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

const PublicReturns = () => {
  const { storeSlug } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState({
    pedido: '',
    email: '',
    nome: '',
    tipo: '',
    motivo: '',
    observacoes: '',
    anexos: [] as File[]
  });

  const motivosComuns = [
    'Tamanho incorreto',
    'Cor diferente do esperado',
    'Produto com defeito',
    'Não gostei do produto',
    'Produto danificado na entrega',
    'Arrependimento da compra',
    'Produto diferente da descrição',
    'Outro motivo'
  ];

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.pedido || !formData.email || !formData.nome || !formData.tipo || !formData.motivo) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Simular envio
    setTimeout(() => {
      setStep('success');
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação foi recebida e será analisada em breve."
      });
    }, 1000);
  };

  const handleNewRequest = () => {
    setStep('form');
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
              Trocas & Devoluções
            </h1>
            <p className="text-muted-foreground">
              Portal público da {storeSlug?.replace(/-/g, ' ')}
            </p>
          </div>

          {/* Success Card */}
          <Card className="glass-card text-center">
            <CardContent className="py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Solicitação Enviada com Sucesso!
              </h2>
              
              <div className="space-y-3 mb-8">
                <p className="text-muted-foreground">
                  Sua solicitação foi recebida e está sendo processada.
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Protocolo da solicitação:</p>
                  <Badge variant="outline" className="text-base font-mono">
                    RT-{Date.now().toString().slice(-6)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Guarde este número para acompanhar o status da sua solicitação.
                  Você receberá atualizações por e-mail.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleNewRequest}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Nova Solicitação
                </Button>
                <Button onClick={() => window.close()}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>Powered by Convertfy</p>
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
            Trocas & Devoluções
          </h1>
          <p className="text-muted-foreground">
            Portal público da {storeSlug?.replace(/-/g, ' ')}
          </p>
        </div>

        {/* Form Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Package className="h-5 w-5" />
              Solicitar Troca ou Devolução
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Preencha os dados abaixo para solicitar a troca ou devolução do seu produto.
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados do Pedido */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Dados do Pedido</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pedido" className="text-foreground">Número do Pedido *</Label>
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
                    <Label htmlFor="email" className="text-foreground">E-mail do Pedido *</Label>
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
                  <Label htmlFor="nome" className="text-foreground">Nome Completo *</Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome completo"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="text-foreground"
                  />
                </div>
              </div>

              {/* Tipo de Solicitação */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Tipo de Solicitação</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo" className="text-foreground">Tipo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                      required
                    >
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="Troca" className="text-foreground">Troca</SelectItem>
                        <SelectItem value="Devolução" className="text-foreground">Devolução</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="motivo" className="text-foreground">Motivo *</Label>
                    <Select
                      value={formData.motivo}
                      onValueChange={(value) => setFormData({ ...formData, motivo: value })}
                      required
                    >
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {motivosComuns.map((motivo) => (
                          <SelectItem key={motivo} value={motivo} className="text-foreground">
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
                <Label htmlFor="observacoes" className="text-foreground">Observações Adicionais</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Descreva detalhadamente o problema ou motivo da solicitação..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="min-h-[100px] text-foreground"
                />
              </div>

              {/* Upload de Arquivos */}
              <div className="space-y-4">
                <Label className="text-foreground">Anexos (Opcional)</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique para adicionar fotos ou documentos (máximo 5 arquivos)
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
                    Escolher Arquivos
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
                          Remover
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
                    <p className="font-medium text-blue-800 mb-1">Importante:</p>
                    <p className="text-blue-700">
                      Sua solicitação será analisada em até 2 dias úteis. 
                      Você receberá atualizações por e-mail sobre o status.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg">
                Enviar Solicitação
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by Convertfy</p>
        </div>
      </div>
    </div>
  );
};

export default PublicReturns;