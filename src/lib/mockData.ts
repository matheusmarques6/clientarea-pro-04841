import { Store, ReturnRequest, RefundRequest, Product, ProductCost, DashboardStats } from '@/types';

export const mockStores: Store[] = [
  {
    id: '1',
    name: 'Loja Fashion Brasil',
    country: 'Brasil',
    currency: 'BRL',
    revenue30d: 126500,
    integrationStatus: 'connected',
    shopifyUrl: 'fashionbrasil.myshopify.com',
    description: 'Moda feminina e masculina',
    returnsLanguage: 'pt',
    refundsLanguage: 'pt'
  },
  {
    id: '2',
    name: 'TechStore USA',
    country: 'Estados Unidos',
    currency: 'USD',
    revenue30d: 89200,
    integrationStatus: 'connected',
    shopifyUrl: 'techstore.myshopify.com',
    description: 'Produtos de tecnologia',
    returnsLanguage: 'en',
    refundsLanguage: 'en'
  },
  {
    id: '3',
    name: 'Euro Style',
    country: 'França',
    currency: 'EUR',
    revenue30d: 67800,
    integrationStatus: 'pending',
    shopifyUrl: 'eurostyle.myshopify.com',
    description: 'Moda europeia',
    returnsLanguage: 'fr',
    refundsLanguage: 'fr'
  },
  {
    id: '4',
    name: 'UK Electronics',
    country: 'Reino Unido',
    currency: 'GBP',
    revenue30d: 54300,
    integrationStatus: 'disconnected',
    description: 'Eletrônicos premium',
    returnsLanguage: 'en',
    refundsLanguage: 'en'
  }
];

export const mockReturns: ReturnRequest[] = [
  {
    id: 'RT-1023',
    pedido: '#28471',
    cliente: 'Maria Lima',
    tipo: 'Devolução',
    motivo: 'Tamanho incorreto',
    valor: 289.90,
    status: 'Em análise',
    createdAt: '2025-09-15T10:30:00Z',
    updatedAt: '2025-09-15T14:20:00Z',
    origem: 'Link público',
    observacoes: 'Cliente informou que o produto veio em tamanho diferente do solicitado',
    timeline: [
      {
        id: '1',
        timestamp: '2025-09-15T10:30:00Z',
        action: 'Criada',
        description: 'Solicitação criada via link público',
        user: 'Sistema'
      },
      {
        id: '2',
        timestamp: '2025-09-15T14:20:00Z',
        action: 'Em análise',
        description: 'Movida para análise pela equipe',
        user: 'João Silva'
      }
    ]
  },
  {
    id: 'RT-1024',
    pedido: '#28502',
    cliente: 'João Santos',
    tipo: 'Troca',
    motivo: 'Cor diferente',
    valor: 219.90,
    status: 'Aprovada',
    createdAt: '2025-09-16T09:15:00Z',
    updatedAt: '2025-09-16T11:45:00Z',
    origem: 'Interna',
    timeline: [
      {
        id: '1',
        timestamp: '2025-09-16T09:15:00Z',
        action: 'Criada',
        description: 'Solicitação criada internamente',
        user: 'Ana Costa'
      },
      {
        id: '2',
        timestamp: '2025-09-16T11:45:00Z',
        action: 'Aprovada',
        description: 'Solicitação aprovada automaticamente',
        user: 'Sistema'
      }
    ]
  },
  {
    id: 'RT-1025',
    pedido: '#28503',
    cliente: 'Ana Costa',
    tipo: 'Devolução',
    motivo: 'Produto danificado',
    valor: 159.90,
    status: 'Aguardando postagem',
    createdAt: '2025-09-16T15:20:00Z',
    updatedAt: '2025-09-17T08:30:00Z',
    origem: 'Link público',
    timeline: [
      {
        id: '1',
        timestamp: '2025-09-16T15:20:00Z',
        action: 'Criada',
        description: 'Solicitação criada via link público',
        user: 'Sistema'
      },
      {
        id: '2',
        timestamp: '2025-09-17T08:30:00Z',
        action: 'Aprovada',
        description: 'Aprovada após análise',
        user: 'Carlos Santos'
      },
      {
        id: '3',
        timestamp: '2025-09-17T08:35:00Z',
        action: 'Aguardando postagem',
        description: 'Etiqueta gerada, aguardando postagem',
        user: 'Sistema'
      }
    ]
  },
  {
    id: 'RT-1026',
    pedido: '#28504',
    cliente: 'Carlos Ferreira',
    tipo: 'Troca',
    motivo: 'Tamanho incorreto',
    valor: 399.90,
    status: 'Nova',
    createdAt: '2025-09-18T16:45:00Z',
    updatedAt: '2025-09-18T16:45:00Z',
    origem: 'Link público',
    observacoes: 'Cliente solicitou troca do tamanho M para G',
    timeline: [
      {
        id: '1',
        timestamp: '2025-09-18T16:45:00Z',
        action: 'Criada',
        description: 'Solicitação criada via link público',
        user: 'Sistema'
      }
    ]
  },
  {
    id: 'RT-1027',
    pedido: '#28505',
    cliente: 'Fernanda Oliveira',
    tipo: 'Devolução',
    motivo: 'Arrependimento da compra',
    valor: 189.90,
    status: 'Concluída',
    createdAt: '2025-09-10T14:20:00Z',
    updatedAt: '2025-09-17T10:30:00Z',
    origem: 'Interna',
    timeline: [
      {
        id: '1',
        timestamp: '2025-09-10T14:20:00Z',
        action: 'Criada',
        description: 'Solicitação criada internamente',
        user: 'Maria Santos'
      },
      {
        id: '2',
        timestamp: '2025-09-11T09:15:00Z',
        action: 'Aprovada',
        description: 'Solicitação aprovada após análise',
        user: 'João Silva'
      },
      {
        id: '3',
        timestamp: '2025-09-12T11:00:00Z',
        action: 'Recebida em CD',
        description: 'Produto recebido no centro de distribuição',
        user: 'Sistema'
      },
      {
        id: '4',
        timestamp: '2025-09-17T10:30:00Z',
        action: 'Concluída',
        description: 'Processo de devolução concluído e reembolso processado',
        user: 'Sistema'
      }
    ]
  },
  {
    id: 'RT-1028',
    pedido: '#28506',
    cliente: 'Roberto Silva',
    tipo: 'Troca',
    motivo: 'Produto com defeito',
    valor: 299.90,
    status: 'Recusada',
    createdAt: '2025-09-14T11:30:00Z',
    updatedAt: '2025-09-16T14:00:00Z',
    origem: 'Link público',
    observacoes: 'Produto fora do prazo de troca (mais de 30 dias)',
    timeline: [
      {
        id: '1',
        timestamp: '2025-09-14T11:30:00Z',
        action: 'Criada',
        description: 'Solicitação criada via link público',
        user: 'Sistema'
      },
      {
        id: '2',
        timestamp: '2025-09-15T13:45:00Z',
        action: 'Em análise',
        description: 'Movida para análise pela equipe',
        user: 'Ana Costa'
      },
      {
        id: '3',
        timestamp: '2025-09-16T14:00:00Z',
        action: 'Recusada',
        description: 'Solicitação recusada - produto fora do prazo de troca',
        user: 'Carlos Santos'
      }
    ]
  }
];

export const mockRefunds: RefundRequest[] = [
  {
    id: 'RB-3012',
    pedido: '#28620',
    cliente: 'Ana Paula',
    valor: 159.90,
    valorSolicitado: 159.90,
    metodo: 'PIX',
    status: 'Solicitado',
    motivo: 'Produto não entregue',
    createdAt: '2025-09-17T14:20:00Z',
    updatedAt: '2025-09-17T14:20:00Z',
    origem: 'Link público',
    timeline: [
      {
        id: '1',
        timestamp: '2025-09-17T14:20:00Z',
        action: 'Solicitado',
        description: 'Reembolso solicitado via link público',
        user: 'Sistema'
      }
    ]
  },
  {
    id: 'RB-3013',
    pedido: '#28625',
    cliente: 'Carlos Martins',
    valor: 289.90,
    valorSolicitado: 89.90,
    metodo: 'Vale',
    status: 'Processando pagamento',
    motivo: 'Reembolso parcial por dano',
    createdAt: '2025-09-18T10:15:00Z',
    updatedAt: '2025-09-18T16:30:00Z',
    origem: 'Interna',
    timeline: [
      {
        id: '1',
        timestamp: '2025-09-18T10:15:00Z',
        action: 'Solicitado',
        description: 'Reembolso criado internamente',
        user: 'Maria Santos'
      },
      {
        id: '2',
        timestamp: '2025-09-18T14:20:00Z',
        action: 'Aprovado',
        description: 'Aprovado com valor de R$ 89,90',
        user: 'João Silva'
      },
      {
        id: '3',
        timestamp: '2025-09-18T16:30:00Z',
        action: 'Processando pagamento',
        description: 'Iniciado processamento do vale-compra',
        user: 'Sistema'
      }
    ]
  }
];

export const mockProducts: Product[] = [
  {
    id: 111,
    title: 'Camiseta Premium Convertfy',
    variants: [
      {
        id: 1111,
        sku: 'TSHIRT-BLK-M',
        title: 'Preta M',
        price: 119.90,
        inventoryQuantity: 25
      },
      {
        id: 1112,
        sku: 'TSHIRT-BLK-G',
        title: 'Preta G',
        price: 119.90,
        inventoryQuantity: 18
      },
      {
        id: 1113,
        sku: 'TSHIRT-WHT-M',
        title: 'Branca M',
        price: 119.90,
        inventoryQuantity: 32
      }
    ]
  },
  {
    id: 222,
    title: 'Calça Slim Fit',
    variants: [
      {
        id: 2221,
        sku: 'PANTS-NV-42',
        title: 'Azul Marinho 42',
        price: 249.90,
        inventoryQuantity: 15
      },
      {
        id: 2222,
        sku: 'PANTS-BLK-42',
        title: 'Preta 42',
        price: 249.90,
        inventoryQuantity: 12
      }
    ]
  },
  {
    id: 333,
    title: 'Jaqueta Premium',
    variants: [
      {
        id: 3331,
        sku: 'JACKET-BLK-M',
        title: 'Preta M',
        price: 449.90,
        inventoryQuantity: 8
      }
    ]
  }
];

export const mockProductCosts: { [sku: string]: ProductCost } = {
  'TSHIRT-BLK-M': {
    sku: 'TSHIRT-BLK-M',
    costs: {
      BRL: 42.00,
      USD: 8.10
    },
    updatedAt: '2025-09-15T10:30:00Z',
    updatedBy: 'João Silva'
  },
  'PANTS-NV-42': {
    sku: 'PANTS-NV-42',
    costs: {
      BRL: 95.00,
      USD: 18.30,
      EUR: 17.20
    },
    updatedAt: '2025-09-14T14:20:00Z',
    updatedBy: 'Maria Santos'
  },
  'JACKET-BLK-M': {
    sku: 'JACKET-BLK-M',
    costs: {
      BRL: 185.00,
      USD: 35.60,
      EUR: 33.10,
      GBP: 28.90
    },
    updatedAt: '2025-09-13T09:45:00Z',
    updatedBy: 'Carlos Lima'
  }
};

export const mockFxRates = {
  USD_BRL: 5.20,
  EUR_BRL: 5.60,
  GBP_BRL: 6.40
};

export const mockDashboardStats: DashboardStats = {
  faturamentoTotal: 126500,
  faturamentoConvertfy: 16400,
  margemCFY: 23.5,
  lucroLiquidoCFY: 3854,
  crescimento: 12.8,
  periodo: '30 dias'
};

export const mockChannelRevenue = [
  { channel: 'E-mail', revenue: 6200, percentage: 37.8 },
  { channel: 'WhatsApp', revenue: 5890, percentage: 35.9 },
  { channel: 'SMS', revenue: 4310, percentage: 26.3 }
];

export const mockChartData = [
  { date: '2025-09-01', total: 4200, convertfy: 580 },
  { date: '2025-09-02', total: 3800, convertfy: 620 },
  { date: '2025-09-03', total: 5100, convertfy: 710 },
  { date: '2025-09-04', total: 4600, convertfy: 590 },
  { date: '2025-09-05', total: 5200, convertfy: 680 },
  { date: '2025-09-06', total: 4900, convertfy: 640 },
  { date: '2025-09-07', total: 5500, convertfy: 750 },
  { date: '2025-09-08', total: 4300, convertfy: 570 },
  { date: '2025-09-09', total: 4800, convertfy: 620 },
  { date: '2025-09-10', total: 5300, convertfy: 720 },
  { date: '2025-09-11', total: 4700, convertfy: 610 },
  { date: '2025-09-12', total: 5100, convertfy: 690 },
  { date: '2025-09-13', total: 4900, convertfy: 650 },
  { date: '2025-09-14', total: 5400, convertfy: 740 }
];

export const featureFlags: { [key: string]: boolean } = {
  USE_SHOPIFY_MOCK: true,
  INCLUDE_PRODUCT_COST: true
};