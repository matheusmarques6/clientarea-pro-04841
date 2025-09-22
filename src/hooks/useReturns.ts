import { useReturns as useSupabaseReturns } from './useSupabaseData';

export interface ReturnRequest {
  id: string;
  store_id: string;
  order_code: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  type: string;
  reason?: string;
  notes?: string;
  amount?: number;
  status: string;
  origin?: string;
  created_at: string;
  updated_at: string;
  code?: string;
  sla_days?: number;
  return_items?: any[];
  return_events?: any[];
  return_labels?: any[];
  // Legacy fields for backward compatibility
  pedido?: string;
  cliente?: string;
  motivo?: string;
  valor?: number;
  origem?: string;
  observacoes?: string;
  timeline?: any[];
}

export const useReturns = (storeId?: string) => {
  const { data: returns, loading, error, refetch } = useSupabaseReturns(storeId);

  return { 
    returns: returns as ReturnRequest[], 
    loading, 
    error,
    refetch
  };
};