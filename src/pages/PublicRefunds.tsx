import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload, X, HelpCircle, CheckCircle, Clock, FileText, CreditCard } from 'lucide-react';
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
  { id: 1, title: 'Identificação', description: 'Validar pedido', icon: FileText },
  { id: 2, title: 'Itens', description: 'Selecionar produtos', icon: CheckCircle },
  { id: 3, title: 'Motivo & Provas', description: 'Informar razão', icon: Upload },
  { id: 4, title: 'Método & Valor', description: 'Como receber', icon: CreditCard },
  { id: 5, title: 'Revisão', description: 'Confirmar dados', icon: Check },
  { id: 6, title: 'Confirmação', description: 'Protocolo gerado', icon: CheckCircle }
];

const reasons = [
  { code: 'ARREP', label: 'Arrependimento', description: 'Mudei de ideia sobre a compra' },
  { code: 'DEFEITO', label: 'Defeito', description: 'Produto apresenta defeito de fabricação' },
  { code: 'DANIFICADO', label: 'Danificado', description: 'Produto chegou danificado' },
  { code: 'ERRADO', label: 'Produto errado', description: 'Recebi produto diferente do pedido' },
  { code: 'NAO_RECEBI', label: 'Não recebi', description: 'Produto não foi entregue' },
  { code: 'OUTRO', label: 'Outro motivo', description: 'Motivo não listado acima' }
];

export default function PublicRefunds() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Solicitação de Reembolso
            </h1>
            <p className="text-lg text-gray-600">
              Preencha os dados abaixo para solicitar o reembolso
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="mb-8 bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="mb-6">
              <Progress value={progressPercentage} className="h-3 mb-6" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {steps.map((step) => {
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className={`text-center transition-all duration-200 ${
                        step.id === currentStep
                          ? 'text-primary scale-105'
                          : step.id < currentStep
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    >
                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 transition-all duration-200 ${
                        step.id === currentStep
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : step.id < currentStep
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs opacity-75">{step.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                    {currentStep}
                  </div>
                  <span>{steps[currentStep - 1]?.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Identification */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="orderId" className="text-base font-medium">Número do Pedido *</Label>
                      <Input
                        id="orderId"
                        placeholder="Ex: #28471"
                        value={formData.orderId}
                        onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                        className="mt-2 h-12 text-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="email" className="text-base font-medium">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-2 h-12"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-base font-medium">Telefone (opcional)</Label>
                        <Input
                          id="phone"
                          placeholder="+55 11 99999-9999"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="mt-2 h-12"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-blue-800">
                          <p className="font-medium mb-1">Como encontrar meu pedido?</p>
                          <p className="text-sm">Verifique o e-mail de confirmação da compra ou consulte sua conta no site da loja.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Item Selection */}
                {currentStep === 2 && order && (
                  <div className="space-y-6">
                    <div className="text-base text-muted-foreground">
                      Selecione os itens que deseja solicitar reembolso:
                    </div>

                    <div className="space-y-4">
                      {order.items.map((item) => {
                        const selectedItem = formData.selectedItems.find(si => si.itemId === item.id);
                        const selectedQty = selectedItem?.quantity || 0;

                        return (
                          <Card key={item.id} className="border-2 hover:border-primary/30 transition-all duration-200">
                            <CardContent className="p-6">
                              <div className="flex flex-col sm:flex-row gap-4">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full sm:w-20 h-48 sm:h-20 rounded-lg object-cover"
                                />
                                <div className="flex-1 space-y-2">
                                  <h4 className="font-semibold text-lg">{item.title}</h4>
                                  <p className="text-muted-foreground">{item.variant}</p>
                                  <p className="text-lg font-bold text-green-600">
                                    {formatCurrency(item.price)} cada
                                  </p>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:text-right gap-4">
                                  <div className="text-muted-foreground">
                                    Comprou: <span className="font-medium">{item.quantity}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Label htmlFor={`qty-${item.id}`} className="font-medium">
                                      Devolver:
                                    </Label>
                                    <Select
                                      value={selectedQty.toString()}
                                      onValueChange={(value) => 
                                        handleItemSelection(item.id, parseInt(value))
                                      }
                                    >
                                      <SelectTrigger className="w-20 h-10">
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
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 3: Reason & Evidence */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="reason" className="text-base font-medium">Motivo do reembolso *</Label>
                      <Select
                        value={formData.reason}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                      >
                        <SelectTrigger className="mt-2 h-12">
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {reasons.map((reason) => (
                            <SelectItem key={reason.code} value={reason.code}>
                              <div className="py-2">
                                <div className="font-medium">{reason.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {reason.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reasonNote" className="text-base font-medium">Observações (opcional)</Label>
                      <Textarea
                        id="reasonNote"
                        placeholder="Descreva melhor o motivo do reembolso..."
                        value={formData.reasonNote}
                        onChange={(e) => setFormData(prev => ({ ...prev, reasonNote: e.target.value }))}
                        className="mt-2 min-h-24"
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium">Anexos (fotos/vídeos)</Label>
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={(e) => handleFileUpload(e.target.files)}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-lg font-medium">Clique para adicionar arquivos</p>
                          <p className="text-sm text-muted-foreground">PNG, JPG, MP4 até 10MB (máximo 5 arquivos)</p>
                        </label>
                      </div>

                      {formData.attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {formData.attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-500" />
                                <span className="text-sm font-medium">{file.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Method & Amount */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-green-800">
                        <p className="font-semibold text-lg">Valor do reembolso</p>
                        <p className="text-2xl font-bold">{formatCurrency(getSelectedItemsTotal())}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Como deseja receber o reembolso? *</Label>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { value: 'CARD', label: 'Estorno no cartão', description: 'Em até 5 dias úteis', icon: CreditCard },
                          { value: 'PIX', label: 'PIX', description: 'Em até 1 dia útil', icon: Clock },
                          { value: 'VOUCHER', label: 'Vale-compra', description: 'Imediato + 10% bônus', icon: CheckCircle },
                        ].map((method) => {
                          const MethodIcon = method.icon;
                          return (
                            <Card
                              key={method.value}
                              className={`cursor-pointer transition-all duration-200 ${
                                formData.method === method.value
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-gray-300'
                              }`}
                              onClick={() => setFormData(prev => ({ ...prev, method: method.value }))}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <MethodIcon className="w-6 h-6 text-primary mt-1" />
                                  <div>
                                    <h4 className="font-semibold">{method.label}</h4>
                                    <p className="text-sm text-muted-foreground">{method.description}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {formData.method === 'PIX' && (
                      <div>
                        <Label htmlFor="pixKey" className="text-base font-medium">Chave PIX *</Label>
                        <Input
                          id="pixKey"
                          placeholder="Digite sua chave PIX"
                          value={formData.pixKey}
                          onChange={(e) => setFormData(prev => ({ ...prev, pixKey: e.target.value }))}
                          className="mt-2 h-12"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="font-semibold text-lg mb-4">Resumo da solicitação</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Pedido</p>
                          <p className="font-medium">{formData.orderId}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Itens selecionados</p>
                          {formData.selectedItems.map(selectedItem => {
                            const item = order?.items.find(i => i.id === selectedItem.itemId);
                            return item ? (
                              <p key={selectedItem.itemId} className="font-medium">
                                {item.title} - Quantidade: {selectedItem.quantity}
                              </p>
                            ) : null;
                          })}
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Valor total</p>
                          <p className="font-bold text-lg text-green-600">{formatCurrency(getSelectedItemsTotal())}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Método de reembolso</p>
                          <p className="font-medium">
                            {formData.method === 'CARD' && 'Estorno no cartão'}
                            {formData.method === 'PIX' && `PIX - ${formData.pixKey}`}
                            {formData.method === 'VOUCHER' && 'Vale-compra'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Motivo</p>
                          <p className="font-medium">{reasons.find(r => r.code === formData.reason)?.label}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="policy"
                          checked={formData.agreeToPolicy}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, agreeToPolicy: !!checked }))
                          }
                        />
                        <Label htmlFor="policy" className="text-sm leading-relaxed">
                          Aceito a <a href="#" className="text-primary underline">política de reembolsos</a> e 
                          estou ciente dos prazos e condições.
                        </Label>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="truthfulness"
                          checked={formData.confirmTruthfulness}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, confirmTruthfulness: !!checked }))
                          }
                        />
                        <Label htmlFor="truthfulness" className="text-sm leading-relaxed">
                          Confirmo que todas as informações fornecidas são verdadeiras e precisas.
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Confirmation */}
                {currentStep === 6 && protocol && (
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-green-600 mb-2">Solicitação enviada com sucesso!</h3>
                      <p className="text-muted-foreground">Sua solicitação foi registrada e será analisada em breve.</p>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <p className="text-sm text-green-700 mb-2">Protocolo de acompanhamento</p>
                      <p className="text-3xl font-bold text-green-800">{protocol}</p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Próximos passos:</strong><br />
                        1. Você receberá um e-mail de confirmação<br />
                        2. Nossa equipe analisará sua solicitação em até 2 dias úteis<br />
                        3. Você será notificado sobre o status da análise
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => window.open(`/refunds/${storeSlug}/status/${protocol}`, '_blank')}
                      className="w-full h-12"
                    >
                      Acompanhar Status
                    </Button>
                  </div>
                )}

                {/* Navigation */}
                {currentStep < 6 && (
                  <div className="flex justify-between pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 1}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </Button>
                    
                    <Button
                      onClick={currentStep === 5 ? handleSubmit : handleNext}
                      disabled={isLoading}
                      className="flex items-center gap-2 min-w-32"
                    >
                      {isLoading ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : currentStep === 5 ? (
                        <>
                          <Check className="w-4 h-4" />
                          Enviar solicitação
                        </>
                      ) : (
                        <>
                          Continuar
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Summary */}
          {currentStep >= 2 && currentStep <= 5 && order && (
            <div className="lg:col-span-1">
              <Card className="sticky top-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Pedido</p>
                    <p className="font-medium">{formData.orderId}</p>
                  </div>
                  
                  {formData.selectedItems.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Itens selecionados</p>
                      <div className="space-y-2">
                        {formData.selectedItems.map(selectedItem => {
                          const item = order.items.find(i => i.id === selectedItem.itemId);
                          return item ? (
                            <div key={selectedItem.itemId} className="text-sm">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-muted-foreground">
                                Qtd: {selectedItem.quantity} × {formatCurrency(item.price)}
                              </p>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {getSelectedItemsTotal() > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Total</p>
                        <p className="font-bold text-lg text-green-600">
                          {formatCurrency(getSelectedItemsTotal())}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {formData.reason && (
                    <div>
                      <p className="text-sm text-muted-foreground">Motivo</p>
                      <p className="font-medium">{reasons.find(r => r.code === formData.reason)?.label}</p>
                    </div>
                  )}
                  
                  {formData.method && (
                    <div>
                      <p className="text-sm text-muted-foreground">Método</p>
                      <p className="font-medium">
                        {formData.method === 'CARD' && 'Estorno no cartão'}
                        {formData.method === 'PIX' && 'PIX'}
                        {formData.method === 'VOUCHER' && 'Vale-compra'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}