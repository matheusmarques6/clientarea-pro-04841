import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload, X, HelpCircle, CheckCircle, Clock, FileText, CreditCard, Package, MessageCircle, Phone, Mail, Search, AlertCircle, Truck, RefreshCw, Star } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Mock order data
const mockOrder = {
  id: '#28471',
  status: 'delivered',
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
  deliveredAt: '2025-09-15T14:20:00Z',
  trackingCode: 'BR123456789BR',
  shippingAddress: 'Rua das Flores, 123 - São Paulo, SP'
};

const steps = [
  { id: 1, title: 'Identificação', description: 'Encontrar seu pedido', icon: Search },
  { id: 2, title: 'Status', description: 'Verificar situação', icon: Package },
  { id: 3, title: 'Solução', description: 'Resolver problema', icon: CheckCircle },
  { id: 4, title: 'Reembolso', description: 'Se necessário', icon: CreditCard }
];

const faqData = [
  {
    question: "Meu pedido não chegou, o que fazer?",
    answer: "Primeiro, verifique o status de entrega com nosso código de rastreamento. Se passou do prazo estimado, entre em contato conosco para verificarmos com a transportadora. Na maioria dos casos, conseguimos localizar o pedido sem necessidade de reembolso."
  },
  {
    question: "O produto chegou com defeito",
    answer: "Enviamos um novo produto imediatamente sem custo adicional. Para defeitos de fabricação, nossa garantia cobre troca gratuita em até 90 dias. Basta nos enviar uma foto do defeito."
  },
  {
    question: "Recebi o produto errado",
    answer: "Nosso erro! Enviamos o produto correto imediatamente e você pode ficar com o produto enviado por engano como cortesia. Sem complicações."
  },
  {
    question: "O produto não serviu/não gostei",
    answer: "Você tem 30 dias para trocar por outro tamanho/cor ou devolver. Oferecemos vale-compra com 10% de bônus para facilitar sua próxima compra."
  },
  {
    question: "Quanto tempo demora o reembolso?",
    answer: "Cartão: 5-10 dias úteis. PIX: até 24h. Vale-compra: imediato + 10% bônus. Boleto: até 3 dias úteis."
  },
  {
    question: "Posso cancelar antes do envio?",
    answer: "Sim! Se o pedido ainda não foi enviado, cancelamos imediatamente com reembolso total. Se já foi enviado, você pode recusar a entrega."
  }
];

const problemSolutions = [
  {
    id: 'exchange',
    title: 'Trocar por outro produto',
    description: 'Escolha outro tamanho, cor ou modelo',
    icon: RefreshCw,
    benefit: 'Sem custo adicional'
  },
  {
    id: 'voucher',
    title: 'Vale-compra com bônus',
    description: 'Receba o valor + 10% de bônus',
    icon: Star,
    benefit: 'Ganhe 10% extra'
  },
  {
    id: 'repair',
    title: 'Reparo gratuito',
    description: 'Consertamos sem custo',
    icon: CheckCircle,
    benefit: 'Produto como novo'
  },
  {
    id: 'replacement',
    title: 'Envio de novo produto',
    description: 'Produto novo sem custo',
    icon: Package,
    benefit: 'Entrega expressa'
  }
];

const reasons = [
  { code: 'ARREP', label: 'Mudei de ideia', description: 'Não quero mais o produto' },
  { code: 'DEFEITO', label: 'Produto com defeito', description: 'Problema de fabricação' },
  { code: 'DANIFICADO', label: 'Chegou danificado', description: 'Produto danificado no transporte' },
  { code: 'ERRADO', label: 'Produto errado', description: 'Recebi produto diferente' },
  { code: 'NAO_RECEBI', label: 'Não recebi', description: 'Produto não foi entregue' },
  { code: 'OUTRO', label: 'Outro motivo', description: 'Motivo não listado' }
];

export default function PublicRefunds() {
  const { storeSlug } = useParams();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    identifier: '', // email ou pedido
    identifierType: 'email', // 'email' ou 'order'
    selectedItems: [] as Array<{itemId: string, quantity: number}>,
    reason: '',
    reasonNote: '',
    attachments: [] as File[],
    refundAmount: 0,
    method: '',
    pixKey: '',
    selectedSolution: '',
    agreeToPolicy: false,
    confirmTruthfulness: false
  });
  
  const [order, setOrder] = useState<typeof mockOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [showSolutions, setShowSolutions] = useState(false);

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep === 2 && !showSolutions) {
        setShowSolutions(true);
        return;
      }
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    if (currentStep === 2 && showSolutions) {
      setShowSolutions(false);
      return;
    }
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.identifier) {
          toast({
            title: "Campo obrigatório",
            description: "Informe seu e-mail ou número do pedido",
            variant: "destructive"
          });
          return false;
        }
        return validateOrder();
      
      case 3:
        if (!formData.reason) {
          toast({
            title: "Motivo obrigatório",
            description: "Selecione o motivo do reembolso",
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
      const isEmail = formData.identifier.includes('@');
      const isValidOrder = formData.identifier === '#28471';
      const isValidEmail = formData.identifier === 'maria@email.com';
      
      if ((isEmail && isValidEmail) || (!isEmail && isValidOrder)) {
        setOrder(mockOrder);
        setCurrentStep(2);
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

  const handleSolutionSelect = (solutionId: string) => {
    setFormData(prev => ({ ...prev, selectedSolution: solutionId }));
    
    // Simulate solution success
    setTimeout(() => {
      toast({
        title: "Solução aplicada!",
        description: "Entraremos em contato em breve para finalizar sua solicitação.",
      });
      
      setProtocol(`SOL-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
      setCurrentStep(4);
    }, 1500);
  };

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  const OrderStatus = () => (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Truck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-800">Pedido Entregue</h3>
            <p className="text-green-600">Entregue em {formatDate(order?.deliveredAt || '')}</p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Código de rastreamento:</span>
            <span className="font-medium">{order?.trackingCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Endereço de entrega:</span>
            <span className="font-medium text-right">{order?.shippingAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total do pedido:</span>
            <span className="font-bold text-lg">{formatCurrency(order?.total || 0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Central de Ajuda
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Estamos aqui para resolver seu problema da melhor forma possível
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6">
              <Progress value={progressPercentage} className="h-3 mb-6" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
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
                    <div className="text-center">
                      <Search className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                      <h2 className="text-xl font-semibold mb-2">Vamos encontrar seu pedido</h2>
                      <p className="text-muted-foreground">Informe seu e-mail ou número do pedido para começar</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-4">
                      <div>
                        <Label htmlFor="identifier" className="text-base font-medium">E-mail ou Número do Pedido</Label>
                        <Input
                          id="identifier"
                          placeholder="maria@email.com ou #28471"
                          value={formData.identifier}
                          onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                          className="mt-2 h-12 text-lg"
                        />
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-blue-800">
                            <p className="font-medium mb-1">Não lembra o número do pedido?</p>
                            <p className="text-sm">Use o e-mail que você usou na compra. Encontraremos todos os seus pedidos automaticamente.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Order Status */}
                {currentStep === 2 && order && !showSolutions && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <Package className="w-16 h-16 mx-auto text-green-500 mb-4" />
                      <h2 className="text-xl font-semibold mb-2">Encontramos seu pedido!</h2>
                      <p className="text-muted-foreground">Vamos verificar se está tudo certo com sua entrega</p>
                    </div>

                    <OrderStatus />

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-amber-800 mb-2">Antes de solicitar reembolso...</h3>
                          <p className="text-amber-700 mb-4">Na maioria dos casos, conseguimos resolver seu problema sem reembolso, de forma mais rápida e conveniente!</p>
                          <Button 
                            onClick={() => setShowSolutions(true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Ver soluções disponíveis
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Mesmo assim quer solicitar reembolso?
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(3)}
                        className="border-2"
                      >
                        Continuar com reembolso
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2.5: Solutions */}
                {currentStep === 2 && showSolutions && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <CheckCircle className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                      <h2 className="text-xl font-semibold mb-2">Escolha a melhor solução</h2>
                      <p className="text-muted-foreground">Soluções rápidas e vantajosas para você</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {problemSolutions.map((solution) => {
                        const SolutionIcon = solution.icon;
                        return (
                          <Card
                            key={solution.id}
                            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/50"
                            onClick={() => handleSolutionSelect(solution.id)}
                          >
                            <CardContent className="p-6 text-center">
                              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                                <SolutionIcon className="w-6 h-6 text-purple-600" />
                              </div>
                              <h3 className="font-semibold mb-2">{solution.title}</h3>
                              <p className="text-sm text-muted-foreground mb-3">{solution.description}</p>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                {solution.benefit}
                              </Badge>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(3)}
                        className="border-2"
                      >
                        Nenhuma solução me atende, quero reembolso
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Refund Request */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <CreditCard className="w-16 h-16 mx-auto text-red-500 mb-4" />
                      <h2 className="text-xl font-semibold mb-2">Solicitação de Reembolso</h2>
                      <p className="text-muted-foreground">Conte-nos o que aconteceu para processar seu reembolso</p>
                    </div>

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
                        <Label htmlFor="reasonNote" className="text-base font-medium">Descreva o problema (opcional)</Label>
                        <Textarea
                          id="reasonNote"
                          placeholder="Conte-nos mais detalhes sobre o que aconteceu..."
                          value={formData.reasonNote}
                          onChange={(e) => setFormData(prev => ({ ...prev, reasonNote: e.target.value }))}
                          className="mt-2 min-h-24"
                        />
                      </div>

                      <div>
                        <Label className="text-base font-medium">Anexar fotos (opcional)</Label>
                        <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm font-medium">Clique para adicionar fotos</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG até 5MB cada</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Success/Protocol */}
                {currentStep === 4 && protocol && (
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-green-600 mb-2">
                        {formData.selectedSolution ? 'Solução aplicada!' : 'Reembolso solicitado!'}
                      </h3>
                      <p className="text-muted-foreground">
                        {formData.selectedSolution 
                          ? 'Entraremos em contato para finalizar sua solicitação'
                          : 'Sua solicitação foi registrada e será analisada em breve'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <p className="text-sm text-green-700 mb-2">Protocolo de acompanhamento</p>
                      <p className="text-3xl font-bold text-green-800">{protocol}</p>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span>E-mail de confirmação enviado</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span>Entraremos em contato em até 24h</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                {currentStep < 4 && (
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
                      onClick={handleNext}
                      disabled={isLoading}
                      className="flex items-center gap-2 min-w-32"
                    >
                      {isLoading ? (
                        <Clock className="w-4 h-4 animate-spin" />
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* FAQ */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    Perguntas Frequentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-2">
                    {faqData.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`} className="border border-border/50 rounded-lg px-4">
                        <AccordionTrigger className="text-sm font-medium text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-semibold text-blue-800 mb-2">Precisa de ajuda?</h3>
                  <p className="text-sm text-blue-600 mb-4">Nossa equipe está pronta para ajudar você</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                      <Phone className="w-4 h-4 mr-2" />
                      Ligar agora
                    </Button>
                    <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat online
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              {order && currentStep >= 2 && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pedido:</span>
                      <span className="font-medium">{order.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold text-lg">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className="bg-green-100 text-green-800">Entregue</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">{formatDate(order.deliveredAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}