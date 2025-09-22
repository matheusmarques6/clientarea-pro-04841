import { useRefunds as useSupabaseRefunds } from './useSupabaseData';

export interface RefundRequest {
  id: string;
  store_id: string;
  order_code: string;
  customer_name: string;
  customer_email?: string;
  requested_amount: number;
  final_amount?: number;
  method?: string;
  reason?: string;
  status: string;
  origin?: string;
  created_at: string;
  updated_at: string;
  code?: string;
  transaction_id?: string;
  refund_events?: any[];
  refund_payments?: any[];
  // Legacy fields for backward compatibility
  pedido?: string;
  cliente?: string;
  valor?: number;
  valorSolicitado?: number;
  motivo?: string;
  origem?: string;
  timeline?: any[];
}

export const useRefunds = (storeId?: string) => {
  const { data: refunds, loading, error, refetch } = useSupabaseRefunds(storeId);

  return { 
    refunds: refunds as RefundRequest[], 
    loading, 
    error,
    refetch
  };
};