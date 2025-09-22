import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type RefundStatus = 'requested' | 'review' | 'approved' | 'processing' | 'done' | 'rejected';

export interface RefundRequest {
  id: string;
  store_id: string;
  order_code: string;
  customer_name: string;
  customer_email?: string;
  requested_amount: number;
  final_amount?: number;
  method: string;
  reason?: string;
  status: RefundStatus;
  origin: string;
  created_at: string;
  updated_at: string;
  code?: string;
  transaction_id?: string;
  refund_events?: RefundEvent[];
}

export interface RefundEvent {
  id: string;
  refund_id: string;
  from_status?: RefundStatus;
  to_status: RefundStatus;
  reason?: string;
  user_id?: string;
  created_at: string;
}

export interface CreateRefundData {
  order_code: string;
  customer_name: string;
  customer_email?: string;
  requested_amount: number;
  method?: string;
  reason?: string;
  origin?: string;
}

export const useRefunds = (storeId: string) => {
  const { toast } = useToast();

  const refundsQuery = useSupabaseQuery(
    ['refunds', storeId],
    async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          refund_events (*)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RefundRequest[];
    }
  );

  const createRefundMutation = useSupabaseMutation(
    async (refundData: CreateRefundData) => {
      // Create refund with proper typing
      const refundRecord = {
        store_id: storeId,
        order_code: refundData.order_code,
        customer_name: refundData.customer_name,
        customer_email: refundData.customer_email,
        requested_amount: refundData.requested_amount,
        method: refundData.method || 'pix',
        reason: refundData.reason,
        origin: refundData.origin || 'internal',
        status: 'requested' as RefundStatus,
      };

      const { data: insertedRefund, error: refundError } = await supabase
        .from('refunds')
        .insert([refundRecord])
        .select()
        .single();

      if (refundError) throw refundError;

      // Create initial event
      const { error: eventError } = await supabase
        .from('refund_events')
        .insert([{
          refund_id: insertedRefund.id,
          to_status: 'requested' as RefundStatus,
          reason: 'Solicitação criada',
        }]);

      if (eventError) throw eventError;

      return insertedRefund;
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "Solicitação de reembolso criada com sucesso!",
        });
      },
      invalidateKeys: [['refunds', storeId]],
    }
  );

  const updateRefundStatusMutation = useSupabaseMutation(
    async ({ refundId, newStatus, reason }: { refundId: string; newStatus: RefundStatus; reason?: string }) => {
      // Get current refund
      const { data: currentRefund, error: fetchError } = await supabase
        .from('refunds')
        .select('status')
        .eq('id', refundId)
        .single();

      if (fetchError) throw fetchError;

      // Update refund status
      const { error: updateError } = await supabase
        .from('refunds')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', refundId);

      if (updateError) throw updateError;

      // Create event
      const { error: eventError } = await supabase
        .from('refund_events')
        .insert([{
          refund_id: refundId,
          from_status: currentRefund.status as RefundStatus,
          to_status: newStatus,
          reason: reason || `Status alterado para ${newStatus}`,
        }]);

      if (eventError) throw eventError;

      return { refundId, newStatus };
    },
    {
      onSuccess: (data) => {
        toast({
          title: "Status atualizado",
          description: `Status alterado para ${data.newStatus}`,
        });
      },
      invalidateKeys: [['refunds', storeId]],
    }
  );

  return {
    refunds: refundsQuery.data || [],
    isLoading: refundsQuery.isLoading,
    error: refundsQuery.error,
    createRefund: createRefundMutation.mutate,
    isCreating: createRefundMutation.isPending,
    updateStatus: updateRefundStatusMutation.mutate,
    isUpdatingStatus: updateRefundStatusMutation.isPending,
  };
};