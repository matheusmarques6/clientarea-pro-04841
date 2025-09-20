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
  id: '#0001',
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
  { id: 1, title: 'Identificação', icon: Search },
  { id: 2, title: 'Status', icon: Package },
  { id: 3, title: 'Solução', icon: CheckCircle },
  { id: 4, title: 'Finalização', icon: CreditCard }
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
    answer: "Você tem 30 dias para trocar por outro tamanho/cor ou devolver. Oferecemos vale-compra com 15% de bônus para facilitar sua próxima compra."
  },
  {
    question: "Quanto tempo demora o reembolso?",
    answer: "Cartão: 5-10 dias úteis. PIX: até 24h. Vale-compra: imediato + 15% bônus. Boleto: até 3 dias úteis."
  },
  {
    question: "Posso cancelar antes do envio?",
    answer: "Sim! Se o pedido ainda não foi enviado, cancelamos imediatamente com reembolso total. Se já foi enviado, você pode recusar a entrega."
  }
];

const problemSolutions = [
  {
    id: 'voucher',
    title: 'Vale-compra com 15% bônus',
    description: 'Receba o valor + 15% extra para usar na loja',
    icon: Star,
    benefit: 'Ganhe 15% extra',
    priority: 1
  },
  {
    id: 'exchange',
    title: 'Trocar por outro produto',
    description: 'Escolha outro tamanho, cor ou modelo',
    icon: RefreshCw,
    benefit: 'Sem custo adicional',
    priority: 2
  },
  {
    id: 'replacement',
    title: 'Envio de novo produto',
    description: 'Produto novo sem custo',
    icon: Package,
    benefit: 'Entrega expressa',
    priority: 3
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
    selectedItems: [] as Array<{itemId: string, quantity: number}>,
    reason: '',
    reasonNote: '',
    attachments: [] as File[],
    refundAmount: 0,
    method: '',
    pixKey: '',
    selectedSolution: '',
    agreeToPolicy: false,
    confirmTruthfulness: false,
    whyNotVoucher: '',
    futureShop: ''
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
        if (!formData.reasonNote.trim()) {
          toast({
            title: "Descrição obrigatória",
            description: "Descreva detalhadamente o problema",
            variant: "destructive"
          });
          return false;
        }
        if (!formData.whyNotVoucher?.trim()) {
          toast({
            title: "Campo obrigatório",
            description: "Explique por que não aceita o vale-compra",
            variant: "destructive"
          });
          return false;
        }
        if (!formData.futureShop) {
          toast({
            title: "Campo obrigatório",
            description: "Informe se pretende comprar novamente",
            variant: "destructive"
          });
          return false;
        }
        if (!formData.agreeToPolicy || !formData.confirmTruthfulness) {
          toast({
            title: "Aceite os termos",
            description: "É necessário aceitar todos os termos para continuar",
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
      const isValidOrder = formData.identifier === '#0001';
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
    <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-emerald-800">Pedido Entregue</h3>
            <p className="text-emerald-600 text-sm">Entregue em {formatDate(order?.deliveredAt || '')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pedido:</span>
              <span className="font-medium">{order?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rastreamento:</span>
              <span className="font-medium">{order?.trackingCode}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{order?.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-lg text-emerald-700">{formatCurrency(order?.total || 0)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Clean Professional Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary shadow-lg mb-6">
            <MessageCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Central de Atendimento
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Resolvemos sua situação de forma rápida e eficiente
          </p>
        </div>

        {/* Progress Steps */}
        {currentStep > 1 && (
          <div className="mb-8">
            <div className="flex items-center justify-center mb-8">
              <Progress value={progressPercentage} className="w-80 h-2" />
            </div>
            <div className="flex justify-center items-center gap-12">
              {steps.map((step) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      step.id === currentStep ? 'scale-110' : ''
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                      step.id === currentStep
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : step.id < currentStep
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <StepIcon className="w-6 h-6" />
                    </div>
                    <span className={`text-sm font-medium ${
                      step.id <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <Card className="border-0 shadow-2xl bg-white">
          <CardContent className="p-10">
            {/* Step 1: Identification */}
            {currentStep === 1 && (
              <div className="max-w-md mx-auto text-center space-y-8">
                <div>
                  <Search className="w-24 h-24 mx-auto text-primary mb-6" />
                  <h2 className="text-3xl font-semibold mb-4">Consultar Pedido</h2>
                  <p className="text-muted-foreground text-lg">
                    Digite seu e-mail ou número do pedido
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="identifier" className="text-lg font-medium">E-mail ou Número do Pedido</Label>
                    <Input
                      id="identifier"
                      placeholder="maria@email.com ou #0001"
                      value={formData.identifier}
                      onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                      className="mt-3 h-14 text-lg text-center border-2"
                    />
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-6 h-6 text-blue-600 mt-0.5" />
                      <div className="text-blue-800">
                        <p className="font-medium mb-2">Exemplo de teste</p>
                        <p className="text-sm">Use: <strong>#0001</strong> ou <strong>maria@email.com</strong></p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleNext}
                    disabled={isLoading || !formData.identifier}
                    className="w-full h-14 text-lg"
                  >
                    {isLoading ? 'Consultando...' : 'Consultar Pedido'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Order Status */}
            {currentStep === 2 && order && !showSolutions && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold mb-4">Pedido Encontrado</h2>
                  <p className="text-muted-foreground">Aqui estão os detalhes da sua compra</p>
                </div>

                <OrderStatus />

                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-8">
                  <div className="text-center">
                    <Star className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-amber-800 mb-4">Oferta Especial!</h3>
                    <p className="text-amber-700 text-lg mb-6">
                      Resolva com <strong>vale-compra + 15% bônus</strong><br />
                      Mais vantajoso que reembolso!
                    </p>
                    <div className="space-y-4">
                      <Button 
                        onClick={() => setShowSolutions(true)}
                        size="lg"
                        className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-lg px-8 py-3"
                      >
                        Ver Soluções Disponíveis
                      </Button>
                      <div>
                        <Button 
                          variant="ghost" 
                          onClick={() => setCurrentStep(3)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Prefiro solicitar reembolso mesmo assim
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Solutions Display */}
            {currentStep === 2 && showSolutions && (
              <div className="space-y-8">
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">Escolha sua Solução</h2>
                  <p className="text-muted-foreground">Ofertas especiais para resolver rapidamente</p>
                </div>

                <div className="grid gap-6">
                  {problemSolutions.map((solution) => {
                    const SolutionIcon = solution.icon;
                    return (
                      <Card 
                        key={solution.id}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                          solution.priority === 1 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleSolutionSelect(solution.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                              solution.priority === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              <SolutionIcon className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold">{solution.title}</h3>
                                {solution.priority === 1 && (
                                  <Badge className="bg-primary text-primary-foreground">RECOMENDADO</Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground mb-2">{solution.description}</p>
                              <p className="text-sm font-medium text-green-600">{solution.benefit}</p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(3)}
                    className="text-muted-foreground"
                  >
                    Ainda prefiro reembolso
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Refund Form */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">Solicitação de Reembolso</h2>
                  <p className="text-muted-foreground">Precisamos de algumas informações adicionais</p>
                </div>

                <div className="space-y-6 max-w-2xl mx-auto">
                  <div>
                    <Label className="text-lg font-medium">Motivo do reembolso</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}>
                      <SelectTrigger className="mt-2 h-12">
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {reasons.map((reason) => (
                          <SelectItem key={reason.code} value={reason.code}>
                            <div>
                              <div className="font-medium">{reason.label}</div>
                              <div className="text-xs text-muted-foreground">{reason.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-lg font-medium">Descrição detalhada do problema</Label>
                    <Textarea
                      placeholder="Descreva detalhadamente o que aconteceu..."
                      value={formData.reasonNote}
                      onChange={(e) => setFormData(prev => ({ ...prev, reasonNote: e.target.value }))}
                      className="mt-2 min-h-24"
                    />
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
                    <h4 className="font-semibold text-amber-800 mb-4">Por que não aceita o vale-compra com 15% bônus?</h4>
                    <Textarea
                      placeholder="Explique por que prefere reembolso ao invés do vale-compra..."
                      value={formData.whyNotVoucher}
                      onChange={(e) => setFormData(prev => ({ ...prev, whyNotVoucher: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-lg font-medium">Pretende comprar novamente futuramente?</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, futureShop: value }))}>
                      <SelectTrigger className="mt-2 h-12">
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Sim, pretendo comprar novamente</SelectItem>
                        <SelectItem value="maybe">Talvez, depende da experiência</SelectItem>
                        <SelectItem value="no">Não, não pretendo comprar mais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="policy"
                        checked={formData.agreeToPolicy}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToPolicy: !!checked }))}
                      />
                      <Label htmlFor="policy" className="text-sm leading-relaxed">
                        Concordo com os termos da política de reembolso e entendo que o prazo pode ser de até 10 dias úteis
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="truthfulness"
                        checked={formData.confirmTruthfulness}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, confirmTruthfulness: !!checked }))}
                      />
                      <Label htmlFor="truthfulness" className="text-sm leading-relaxed">
                        Declaro que todas as informações fornecidas são verdadeiras
                      </Label>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      Voltar
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Solicitar Reembolso
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {currentStep === 4 && protocol && (
              <div className="text-center space-y-8">
                <div>
                  <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-semibold mb-4">Solicitação Enviada!</h2>
                  <p className="text-muted-foreground text-lg">
                    Sua solicitação foi registrada com sucesso
                  </p>
                </div>

                <Card className="bg-green-50 border-2 border-green-200 max-w-md mx-auto">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm text-green-700 mb-2">Protocolo de atendimento</p>
                      <p className="text-2xl font-bold text-green-800">{protocol}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4 max-w-lg mx-auto">
                  <p className="text-muted-foreground">
                    Entraremos em contato em até 24 horas através do e-mail cadastrado.
                  </p>
                  
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full"
                  >
                    Nova Consulta
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold mb-4">Perguntas Frequentes</h3>
            <p className="text-muted-foreground">Tire suas dúvidas mais comuns</p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqData.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-lg px-6">
                <AccordionTrigger className="text-left font-medium py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}