import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// Mock order data
const mockOrder = {
  id: '#28471',
  customer: {
    name: 'Maria Silva',
    email: 'maria@email.com',
    phone: '+5511999888777'
  },
  items: [
    {
      id: 'item-1',
      sku: 'CAM-001',
      title: 'Camiseta Premium Azul',
      image: '/placeholder.svg',
      variant: 'Tamanho M, Cor Azul',
      quantity: 2,
      price: 89.90,
      currency: 'BRL'
    },
    {
      id: 'item-2',
      sku: 'CALC-001',
      title: 'Calça Jeans Slim',
      image: '/placeholder.svg',
      variant: 'Tamanho 42, Cor Índigo',
      quantity: 1,
      price: 129.90,
      currency: 'BRL'
    }
  ],
  total: 309.70,
  status: 'delivered',
  deliveredAt: '2025-09-15T14:20:00Z'
};

const steps = [
  { id: 1, title: 'Identificação', description: 'Validar pedido' },
  { id: 2, title: 'Itens', description: 'Selecionar produtos' },
  { id: 3, title: 'Motivo & Provas', description: 'Informar razão' },
  { id: 4, title: 'Método & Valor', description: 'Como receber' },
  { id: 5, title: 'Revisão', description: 'Confirmar dados' },
  { id: 6, title: 'Confirmação', description: 'Protocolo gerado' }
];

const reasons = [
  { code: 'ARREP', label: 'Arrependimento', description: 'Mudei de ideia sobre a compra' },
  { code: 'DEFEITO', label: 'Defeito', description: 'Produto apresenta defeito de fabricação' },
  { code: 'DANIFICADO', label: 'Danificado', description: 'Produto chegou danificado' },
  { code: 'ERRADO', label: 'Produto errado', description: 'Recebi produto diferente do pedido' },
  { code: 'NAO_RECEBI', label: 'Não recebi', description: 'Produto não foi entregue' },
  { code: 'OUTRO', label: 'Outro motivo', description: 'Motivo não listado acima' }
];

const PublicRefunds = () => {
  const { storeSlug } = useParams();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    orderId: '',
    email: '',
    phone: '',
    selectedItems: [] as Array<{itemId: string, quantity: number}>,
    reason: '',
    reasonNote: '',
    attachments: [] as File[],
    refundAmount: 0,
    isPartialRefund: false,
    method: '',
    pixKey: '',
    pixKeyType: '',
    accountData: '',
    agreeToPolicy: false,
    confirmTruthfulness: false
  });
  
  const [order, setOrder] = useState<typeof mockOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.orderId || (!formData.email && !formData.phone)) {
          toast({
            title: "Campos obrigatórios",
            description: "Preencha o número do pedido e e-mail ou telefone",
            variant: "destructive"
          });
          return false;
        }
        return validateOrder();
      
      case 2:
        if (formData.selectedItems.length === 0) {
          toast({
            title: "Seleção obrigatória",
            description: "Selecione pelo menos um item para reembolso",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      case 3:
        if (!formData.reason) {
          toast({
            title: "Motivo obrigatório",
            description: "Selecione o motivo do reembolso",
            variant: "destructive"
          });
          return false;
        }
        // Check if photos are required for defects
        if (['DEFEITO', 'DANIFICADO'].includes(formData.reason) && formData.attachments.length === 0) {
          toast({
            title: "Fotos obrigatórias",
            description: "Anexe fotos do produto para motivos de defeito ou dano",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      case 4:
        if (!formData.method) {
          toast({
            title: "Método obrigatório",
            description: "Selecione como deseja receber o reembolso",
            variant: "destructive"
          });
          return false;
        }
        if (formData.method === 'PIX' && !formData.pixKey) {
          toast({
            title: "Chave PIX obrigatória",
            description: "Informe sua chave PIX",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      case 5:
        if (!formData.agreeToPolicy || !formData.confirmTruthfulness) {
          toast({
            title: "Confirmação obrigatória",
            description: "Você deve aceitar os termos e confirmar a veracidade das informações",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const validateOrder = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      if (formData.orderId === '#28471' && (formData.email === 'maria@email.com' || formData.phone === '+5511999888777')) {
        setOrder(mockOrder);
        setIsLoading(false);
        return true;
      } else {
        toast({
          title: "Pedido não encontrado",
          description: "Verifique os dados informados e tente novamente",
          variant: "destructive"
        });
        setIsLoading(false);
        return false;
      }
    }, 1000);
    
    return false;
  };

  const handleItemSelection = (itemId: string, quantity: number) => {
    const updatedItems = formData.selectedItems.filter(item => item.itemId !== itemId);
    if (quantity > 0) {
      updatedItems.push({ itemId, quantity });
    }
    
    setFormData(prev => ({
      ...prev,
      selectedItems: updatedItems
    }));

    // Calculate refund amount
    const totalRefund = updatedItems.reduce((sum, selectedItem) => {
      const orderItem = order?.items.find(item => item.id === selectedItem.itemId);
      return sum + (orderItem ? orderItem.price * selectedItem.quantity : 0);
    }, 0);

    setFormData(prev => ({
      ...prev,
      refundAmount: totalRefund
    }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files).slice(0, 5 - formData.attachments.length);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newFiles]
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const generatedProtocol = `RB-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      setProtocol(generatedProtocol);
      setCurrentStep(6);
      setIsLoading(false);
      
      toast({
        title: "Solicitação enviada",
        description: `Protocolo ${generatedProtocol} gerado com sucesso`,
      });
    }, 2000);
  };

  const getSelectedItemsTotal = () => {
    return formData.selectedItems.reduce((sum, selectedItem) => {
      const orderItem = order?.items.find(item => item.id === selectedItem.itemId);
      return sum + (orderItem ? orderItem.price * selectedItem.quantity : 0);
    }, 0);
  };

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Solicitação de Reembolso
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Preencha os dados abaixo para solicitar o reembolso
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="mb-6 sm:mb-8">
          <Progress value={progressPercentage} className="mb-4" />
          <div className="grid grid-cols-3 sm:flex sm:justify-between gap-2 text-xs sm:text-sm">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`text-center ${
                  step.id === currentStep
                    ? 'text-primary font-medium'
                    : step.id < currentStep
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                <div className="hidden sm:block font-medium">{step.title}</div>
                <div className="text-xs">{step.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {currentStep}
                  </div>
                  <span className="truncate">{steps[currentStep - 1]?.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Step 1: Identification */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="orderId">Número do Pedido</Label>
                      <Input
                        id="orderId"
                        placeholder="Ex: #28471"
                        value={formData.orderId}
                        onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium">Telefone (opcional)</Label>
                        <Input
                          id="phone"
                          placeholder="+55 11 99999-9999"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      Informe o número do pedido e pelo menos um meio de contato
                    </p>
                  </div>
                )}

                {/* Step 2: Item Selection */}
                {currentStep === 2 && order && (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Selecione os itens que deseja solicitar reembolso:
                    </div>

                    {order.items.map((item) => {
                      const selectedItem = formData.selectedItems.find(si => si.itemId === item.id);
                      const selectedQty = selectedItem?.quantity || 0;

                      return (
                        <div key={item.id} className="border rounded-lg p-3 sm:p-4 glass-card">
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full sm:w-16 h-32 sm:h-16 rounded object-cover"
                            />
                            <div className="flex-1 space-y-2">
                              <h4 className="font-medium text-sm sm:text-base">{item.title}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">{item.variant}</p>
                              <p className="text-sm font-medium text-green-600">
                                {formatCurrency(item.price)} cada
                              </p>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:text-right gap-2">
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                Comprou: {item.quantity}
                              </div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`qty-${item.id}`} className="text-xs sm:text-sm">
                                  Devolver:
                                </Label>
                                <Select
                                  value={selectedQty.toString()}
                                  onValueChange={(value) => 
                                    handleItemSelection(item.id, parseInt(value))
                                  }
                                >
                                  <SelectTrigger className="w-16 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: item.quantity + 1 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString()}>
                                        {i}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step 3: Reason & Evidence */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reason">Motivo do reembolso</Label>
                      <Select
                        value={formData.reason}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {reasons.map((reason) => (
                            <SelectItem key={reason.code} value={reason.code}>
                              <div>
                                <div className="font-medium">{reason.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {reason.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reasonNote">Observações (opcional)</Label>
                      <Textarea
                        id="reasonNote"
                        placeholder="Descreva melhor o motivo..."
                        value={formData.reasonNote}
                        onChange={(e) => setFormData(prev => ({ ...prev, reasonNote: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Anexos (fotos/vídeos)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground mb-2">
                          Arraste arquivos aqui ou clique para selecionar
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          className="hidden"
                          id="file-upload"
                          onChange={(e) => handleFileUpload(e.target.files)}
                        />
                        <label htmlFor="file-upload">
                          <Button variant="outline" asChild>
                            <span>Selecionar arquivos</span>
                          </Button>
                        </label>
                        <div className="text-xs text-muted-foreground mt-2">
                          Máximo 5 arquivos, até 10MB cada
                        </div>
                      </div>

                      {formData.attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {formData.attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{file.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {['DEFEITO', 'DANIFICADO'].includes(formData.reason) && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-800">
                          <HelpCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Fotos obrigatórias para este motivo
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Method & Amount */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-3">Valor do reembolso</h3>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm text-green-700 mb-1">Total selecionado</div>
                        <div className="text-2xl font-bold text-green-800">
                          {formatCurrency(getSelectedItemsTotal())}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="method">Como deseja receber?</Label>
                      <Select
                        value={formData.method}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CARD">
                            <div>
                              <div className="font-medium">Cartão de Crédito</div>
                              <div className="text-xs text-muted-foreground">
                                Estorno no cartão usado na compra (5-10 dias úteis)
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="PIX">
                            <div>
                              <div className="font-medium">PIX</div>
                              <div className="text-xs text-muted-foreground">
                                Transferência instantânea
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="VOUCHER">
                            <div>
                              <div className="font-medium">Vale-compra (+10% bônus)</div>
                              <div className="text-xs text-muted-foreground">
                                Receba {formatCurrency(getSelectedItemsTotal() * 1.1)} em vale
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.method === 'PIX' && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="pixKeyType">Tipo da chave PIX</Label>
                          <Select
                            value={formData.pixKeyType}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, pixKeyType: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpf">CPF</SelectItem>
                              <SelectItem value="cnpj">CNPJ</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="random">Chave aleatória</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="pixKey">Chave PIX</Label>
                          <Input
                            id="pixKey"
                            placeholder={
                              formData.pixKeyType === 'cpf' ? '000.000.000-00' :
                              formData.pixKeyType === 'email' ? 'seu@email.com' :
                              formData.pixKeyType === 'phone' ? '+55 11 99999-9999' :
                              'Sua chave PIX'
                            }
                            value={formData.pixKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, pixKey: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Resumo da solicitação</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Pedido:</strong> {order?.id}
                        </div>
                        <div>
                          <strong>Cliente:</strong> {order?.customer.name}
                        </div>
                        <div>
                          <strong>E-mail:</strong> {order?.customer.email}
                        </div>
                        <div>
                          <strong>Motivo:</strong> {reasons.find(r => r.code === formData.reason)?.label}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <strong>Itens selecionados:</strong>
                        <div className="mt-2 space-y-2">
                          {formData.selectedItems.map((selectedItem) => {
                            const orderItem = order?.items.find(item => item.id === selectedItem.itemId);
                            return orderItem ? (
                              <div key={selectedItem.itemId} className="flex justify-between text-sm">
                                <span>{orderItem.title} (x{selectedItem.quantity})</span>
                                <span>{formatCurrency(orderItem.price * selectedItem.quantity)}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between font-medium">
                        <span>Total do reembolso:</span>
                        <span className="text-green-600">
                          {formatCurrency(getSelectedItemsTotal())}
                          {formData.method === 'VOUCHER' && (
                            <span className="text-xs text-green-500 ml-1">
                              (+{formatCurrency(getSelectedItemsTotal() * 0.1)} bônus)
                            </span>
                          )}
                        </span>
                      </div>

                      <div>
                        <strong>Método de reembolso:</strong>{' '}
                        {formData.method === 'CARD' && 'Cartão de Crédito'}
                        {formData.method === 'PIX' && `PIX (${formData.pixKey})`}
                        {formData.method === 'VOUCHER' && 'Vale-compra'}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="agreeToPolicy"
                          checked={formData.agreeToPolicy}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, agreeToPolicy: !!checked }))
                          }
                        />
                        <Label htmlFor="agreeToPolicy" className="text-sm">
                          Li e aceito a política de reembolso da loja
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="confirmTruthfulness"
                          checked={formData.confirmTruthfulness}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, confirmTruthfulness: !!checked }))
                          }
                        />
                        <Label htmlFor="confirmTruthfulness" className="text-sm">
                          Declaro que as informações fornecidas são verdadeiras
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Confirmation */}
                {currentStep === 6 && protocol && (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-green-600 mb-2">
                        Solicitação enviada!
                      </h3>
                      <p className="text-muted-foreground">
                        Seu protocolo de reembolso foi gerado
                      </p>
                    </div>

                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm text-green-700 mb-1">Protocolo</div>
                      <div className="text-3xl font-bold text-green-800">{protocol}</div>
                      <div className="text-sm text-green-600 mt-2">
                        Guarde este número para acompanhar sua solicitação
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p>Um e-mail de confirmação foi enviado para {order?.customer.email}</p>
                      <p className="mt-2">
                        Prazo estimado: 3-5 dias úteis para análise
                      </p>
                    </div>

                    <Button asChild>
                      <a href={`/refunds/${storeSlug}/status/${protocol}`}>
                        Acompanhar status
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>

              {/* Navigation */}
              {currentStep < 6 && (
                <div className="flex flex-col sm:flex-row justify-between gap-3 p-4 sm:p-6 pt-0 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>

                  {currentStep === 5 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : null}
                      Enviar solicitação
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={isLoading}
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <>
                          Continuar
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar Summary */}
          {order && currentStep > 1 && currentStep < 6 && (
            <div className="lg:col-span-1 order-first lg:order-last">
              <Card className="glass-card sticky top-4 lg:top-6">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Pedido</div>
                    <div className="font-medium">{order.id}</div>
                  </div>

                  {formData.selectedItems.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">
                          Itens selecionados
                        </div>
                        <div className="space-y-1">
                          {formData.selectedItems.map((selectedItem) => {
                            const orderItem = order.items.find(item => item.id === selectedItem.itemId);
                            return orderItem ? (
                              <div key={selectedItem.itemId} className="text-sm">
                                <div className="flex justify-between">
                                  <span>{orderItem.title}</span>
                                  <span>x{selectedItem.quantity}</span>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>

                      <Separator />
                      <div>
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span className="text-green-600">
                            {formatCurrency(getSelectedItemsTotal())}
                          </span>
                        </div>
                        {formData.method === 'VOUCHER' && (
                          <div className="text-xs text-green-600 text-right">
                            +{formatCurrency(getSelectedItemsTotal() * 0.1)} bônus
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {formData.reason && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm text-muted-foreground">Motivo</div>
                        <div className="text-sm">
                          {reasons.find(r => r.code === formData.reason)?.label}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicRefunds;