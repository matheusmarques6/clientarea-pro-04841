import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowLeft as StepBack, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStores';

const NewReturn = () => {
  const { id: storeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { store, isLoading } = useStore(storeId!);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1 - Identification
    pedido: '',
    email: '',
    telefone: '',
    // Step 2 - Items
    items: [] as any[],
    // Step 3 - Type and Reason
    tipo: '',
    motivo: '',
    observacoes: '',
    // Step 4 - Attachments and Address
    anexos: [] as File[],
    endereco: {
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: ''
    }
  });
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loja não encontrada</h2>
          <p className="text-muted-foreground mb-4">A loja solicitada não foi encontrada ou você não tem permissão para acessá-la.</p>
          <Button asChild>
            <Link to="/stores">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às lojas
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const mockOrderItems = [
    { id: 1, sku: 'TSHIRT-BLK-M', nome: 'Camiseta Premium Preta M', preco: 119.90, qtd: 1 },
    { id: 2, sku: 'PANTS-NV-42', nome: 'Calça Slim Azul 42', preco: 249.90, qtd: 1 }
  ];

  const motivos = [
    'Tamanho incorreto',
    'Cor diferente',
    'Produto danificado',
    'Não gostei',
    'Defeito de fabricação',
    'Produto não confere descrição',
    'Arrependimento da compra'
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    toast({
      title: "Solicitação criada!",
      description: "A solicitação foi criada e está em análise",
    });
    navigate(`/store/${storeId}/returns`);
  };

  const handleBuscarPedido = () => {
    if (formData.pedido) {
      setFormData({
        ...formData,
        items: mockOrderItems.map(item => ({ ...item, selected: false }))
      });
      toast({
        title: "Pedido encontrado!",
        description: "Itens do pedido carregados com sucesso",
      });
    }
  };

  const steps = [
    { number: 1, title: 'Identificação', description: 'Dados do pedido e cliente' },
    { number: 2, title: 'Itens', description: 'Selecionar produtos' },
    { number: 3, title: 'Tipo e Motivo', description: 'Troca ou devolução' },
    { number: 4, title: 'Finalizar', description: 'Anexos e endereço' }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pedido">Número do Pedido</Label>
              <div className="flex gap-2">
                <Input
                  id="pedido"
                  value={formData.pedido}
                  onChange={(e) => setFormData({...formData, pedido: e.target.value})}
                  placeholder="#28471"
                />
                <Button onClick={handleBuscarPedido} disabled={!formData.pedido}>
                  Buscar
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-mail do Cliente</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="cliente@email.com"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os itens que serão incluídos na solicitação de troca/devolução:
            </p>
            {formData.items.length > 0 ? (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <Card key={item.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(checked) => {
                            const newItems = [...formData.items];
                            newItems[index].selected = checked;
                            setFormData({...formData, items: newItems});
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.nome}</p>
                              <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">R$ {item.preco.toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">Qtd: {item.qtd}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Busque um pedido na etapa anterior para visualizar os itens
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Solicitação</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Troca">Troca</SelectItem>
                  <SelectItem value="Devolução">Devolução</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={formData.motivo} onValueChange={(value) => setFormData({...formData, motivo: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivos.map((motivo) => (
                    <SelectItem key={motivo} value={motivo}>
                      {motivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Descreva mais detalhes sobre a solicitação..."
                rows={4}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Anexos (opcional)</Label>
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Máximo 5 arquivos, até 10MB cada
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Endereço de Coleta</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.endereco.cep}
                    onChange={(e) => setFormData({
                      ...formData,
                      endereco: {...formData.endereco, cep: e.target.value}
                    })}
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.endereco.numero}
                    onChange={(e) => setFormData({
                      ...formData,
                      endereco: {...formData.endereco, numero: e.target.value}
                    })}
                    placeholder="123"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rua">Rua</Label>
                <Input
                  id="rua"
                  value={formData.endereco.rua}
                  onChange={(e) => setFormData({
                    ...formData,
                    endereco: {...formData.endereco, rua: e.target.value}
                  })}
                  placeholder="Rua das Flores"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.endereco.bairro}
                    onChange={(e) => setFormData({
                      ...formData,
                      endereco: {...formData.endereco, bairro: e.target.value}
                    })}
                    placeholder="Centro"
                  />
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.endereco.cidade}
                    onChange={(e) => setFormData({
                      ...formData,
                      endereco: {...formData.endereco, cidade: e.target.value}
                    })}
                    placeholder="São Paulo"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/store/${storeId}/returns`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Solicitação</h1>
          <p className="text-muted-foreground">Trocas & Devoluções • {store.name}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center space-x-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step.number
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > step.number ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-px mx-4 ${
                currentStep > step.number ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <Card className="glass-card max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>
            Etapa {currentStep}: {steps[currentStep - 1].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <StepBack className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            
            {currentStep < 4 ? (
              <Button onClick={handleNext}>
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-2" />
                Criar Solicitação
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewReturn;