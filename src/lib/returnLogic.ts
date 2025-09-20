import { mockStores } from './mockData';

export interface EligibilityRules {
  janelaDias: number;
  valorMinimo: number;
  exigirFotos: boolean;
  aprovarAuto: boolean;
  categoriasBloquadas: string[];
}

export interface OrderValidation {
  isValid: boolean;
  order?: {
    id: string;
    email: string;
    customerName: string;
    total: number;
    items: Array<{
      id: string;
      name: string;
      category: string;
      price: number;
      quantity: number;
    }>;
    orderDate: Date;
    deliveryDate?: Date;
  };
  error?: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  autoApprove: boolean;
  reasons: string[];
  warnings: string[];
}

// Simular dados de pedidos (em produção viria de API)
const mockOrders = [
  {
    id: '#28471',
    email: 'maria@email.com',
    customerName: 'Maria Lima',
    total: 289.90,
    items: [
      { id: '1', name: 'Camiseta Premium', category: 'Roupas', price: 289.90, quantity: 1 }
    ],
    orderDate: new Date('2025-09-10'),
    deliveryDate: new Date('2025-09-12')
  },
  {
    id: '#28502',
    email: 'joao@email.com',
    customerName: 'João Santos',
    total: 219.90,
    items: [
      { id: '2', name: 'Calça Jeans', category: 'Roupas', price: 219.90, quantity: 1 }
    ],
    orderDate: new Date('2025-09-08'),
    deliveryDate: new Date('2025-09-10')
  },
  {
    id: '#28503',
    email: 'ana@email.com',
    customerName: 'Ana Costa',
    total: 159.90,
    items: [
      { id: '3', name: 'Blusa Casual', category: 'Roupas', price: 159.90, quantity: 1 }
    ],
    orderDate: new Date('2025-09-05'),
    deliveryDate: new Date('2025-09-07')
  }
];

export const validateOrder = (orderNumber: string, email: string): OrderValidation => {
  // Simular validação de pedido
  const order = mockOrders.find(o => 
    o.id.toLowerCase() === orderNumber.toLowerCase() && 
    o.email.toLowerCase() === email.toLowerCase()
  );

  if (!order) {
    return {
      isValid: false,
      error: 'Pedido não encontrado ou e-mail não confere'
    };
  }

  return {
    isValid: true,
    order
  };
};

export const checkEligibility = (
  order: OrderValidation['order'],
  rules: EligibilityRules,
  requestType: 'Troca' | 'Devolução',
  reason: string,
  hasPhotos: boolean
): EligibilityResult => {
  if (!order) {
    return {
      isEligible: false,
      autoApprove: false,
      reasons: ['Pedido inválido'],
      warnings: []
    };
  }

  const reasons: string[] = [];
  const warnings: string[] = [];
  let isEligible = true;
  let autoApprove = rules.aprovarAuto;

  // Verificar prazo
  const daysSinceDelivery = order.deliveryDate 
    ? Math.floor((new Date().getTime() - order.deliveryDate.getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((new Date().getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceDelivery > rules.janelaDias) {
    isEligible = false;
    reasons.push(`Prazo excedido: ${daysSinceDelivery} dias (limite: ${rules.janelaDias} dias)`);
  }

  // Verificar valor mínimo
  if (order.total < rules.valorMinimo) {
    isEligible = false;
    reasons.push(`Valor abaixo do mínimo: R$ ${order.total.toFixed(2)} (mínimo: R$ ${rules.valorMinimo.toFixed(2)})`);
  }

  // Verificar categorias bloqueadas
  const blockedItems = order.items.filter(item => 
    rules.categoriasBloquadas.includes(item.category)
  );
  
  if (blockedItems.length > 0) {
    isEligible = false;
    reasons.push(`Categoria bloqueada: ${blockedItems.map(i => i.category).join(', ')}`);
  }

  // Verificar exigência de fotos
  if (rules.exigirFotos && !hasPhotos) {
    autoApprove = false;
    warnings.push('Fotos obrigatórias não enviadas - será necessária análise manual');
  }

  // Regras específicas por motivo
  const suspiciousReasons = ['Arrependimento da compra', 'Não gostei do produto'];
  if (suspiciousReasons.includes(reason)) {
    autoApprove = false;
    warnings.push('Motivo requer análise manual da equipe');
  }

  // Verificar se é troca ou devolução
  if (requestType === 'Troca' && daysSinceDelivery > 7) {
    autoApprove = false;
    warnings.push('Trocas com mais de 7 dias requerem aprovação manual');
  }

  return {
    isEligible,
    autoApprove: isEligible && autoApprove,
    reasons,
    warnings
  };
};

export const generateProtocol = (type: 'Troca' | 'Devolução'): string => {
  const prefix = type === 'Troca' ? 'TR' : 'DV';
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
};

export const getStoreRules = (storeId: string): EligibilityRules => {
  // Em produção, isso viria do banco de dados
  // Por enquanto, retornamos regras padrão
  return {
    janelaDias: 15,
    valorMinimo: 50,
    exigirFotos: true,
    aprovarAuto: true,
    categoriasBloquadas: []
  };
};