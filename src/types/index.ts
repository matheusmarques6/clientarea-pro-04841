export interface Store {
  id: string;
  name: string;
  country: string;
  currency: string;
  revenue30d: number;
  integrationStatus: 'connected' | 'disconnected' | 'pending';
  shopifyUrl?: string;
  description?: string;
  returnsLanguage?: string;
  refundsLanguage?: string;
}

export interface ReturnRequest {
  id: string;
  pedido: string;
  cliente: string;
  tipo: 'Troca' | 'Devolução';
  motivo: string;
  valor: number;
  status: 'Nova' | 'Em análise' | 'Aprovada' | 'Aguardando postagem' | 'Recebida em CD' | 'Concluída' | 'Recusada';
  createdAt: string;
  updatedAt: string;
  origem?: 'Link público' | 'Interna';
  observacoes?: string;
  anexos?: string[];
  timeline?: TimelineEvent[];
}

export interface RefundRequest {
  id: string;
  pedido: string;
  cliente: string;
  valor: number;
  valorSolicitado: number;
  metodo: 'Cartão' | 'PIX' | 'Boleto' | 'Vale';
  status: 'Solicitado' | 'Em análise' | 'Aprovado' | 'Processando pagamento' | 'Concluído' | 'Recusado';
  motivo: string;
  createdAt: string;
  updatedAt: string;
  origem?: 'Link público' | 'Interna';
  anexos?: string[];
  timeline?: TimelineEvent[];
}

export interface Product {
  id: number;
  title: string;
  variants: ProductVariant[];
  image?: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  title: string;
  price: number;
  image?: string;
  inventoryQuantity?: number;
}

export interface ProductCost {
  sku: string;
  costs: {
    BRL?: number;
    USD?: number;
    EUR?: number;
    GBP?: number;
  };
  updatedAt: string;
  updatedBy: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  user: string;
  details?: any;
}

export interface DashboardStats {
  faturamentoTotal: number;
  faturamentoConvertfy: number;
  margemCFY: number;
  lucroLiquidoCFY: number;
  crescimento: number;
  periodo: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color: string;
  items: (ReturnRequest | RefundRequest)[];
}

export interface FeatureFlags {
  USE_SHOPIFY_MOCK: boolean;
  INCLUDE_PRODUCT_COST: boolean;
}