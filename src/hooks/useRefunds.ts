import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RefundRequest {
  id: string;
  store_id: string;
  order_code: string;
  customer_name: string;
  customer_email?: string;
  requested_amount: number;
  final_amount?: number;
  method: 'card' | 'pix' | 'boleto' | 'store_credit';
  reason?: string;
  notes?: string;
  status: 'requested' | 'review' | 'approved' | 'processing' | 'done' | 'rejected';
  origin: 'public' | 'internal';
  created_at: string;
  updated_at: string;
  refund_events?: RefundEvent[];
}

export interface RefundEvent {
  id: string;
  refund_id: string;
  from_status?: string;
  to_status: string;
  reason?: string;
  user_id?: string;
  created_at: string;
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
    async (refundData: Partial<RefundRequest>) => {
      // Create refund
      const { data: refundRecord, error: refundError } = await supabase
        .from('refunds')
        .insert([{ ...refundData, store_id: storeId }])
        .select()
        .single();

      if (refundError) throw refundError;

      // Create initial event
      const { error: eventError } = await supabase
        .from('refund_events')
        .insert([{
          refund_id: refundRecord.id,
          to_status: refundRecord.status,
          reason: 'Solicitação criada',
        }]);

      if (eventError) throw eventError;

      return refundRecord;
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
    async ({ refundId, newStatus, reason }: { refundId: string; newStatus: string; reason?: string }) => {
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
          from_status: currentRefund.status,
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