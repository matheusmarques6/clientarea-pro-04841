import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReturnRequest {
  id: string;
  store_id: string;
  order_code: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  type: 'exchange' | 'return';
  reason?: string;
  notes?: string;
  amount: number;
  status: 'new' | 'review' | 'approved' | 'awaiting_post' | 'received_wh' | 'closed' | 'rejected';
  origin: 'public' | 'internal';
  created_at: string;
  updated_at: string;
  return_items?: ReturnItem[];
  return_events?: ReturnEvent[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  sku: string;
  title: string;
  variant?: string;
  qty: number;
  unit_price: number;
}

export interface ReturnEvent {
  id: string;
  return_id: string;
  from_status?: string;
  to_status: string;
  reason?: string;
  user_id?: string;
  created_at: string;
}

export const useReturns = (storeId: string) => {
  const { toast } = useToast();

  const returnsQuery = useSupabaseQuery(
    ['returns', storeId],
    async () => {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          return_items (*),
          return_events (*)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReturnRequest[];
    }
  );

  const createReturnMutation = useSupabaseMutation(
    async (returnData: Partial<ReturnRequest> & { items: Partial<ReturnItem>[] }) => {
      const { items, ...returnInfo } = returnData;
      
      // Create return
      const { data: returnRecord, error: returnError } = await supabase
        .from('returns')
        .insert([{ ...returnInfo, store_id: storeId }])
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(
            items.map(item => ({
              ...item,
              return_id: returnRecord.id,
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Create initial event
      const { error: eventError } = await supabase
        .from('return_events')
        .insert([{
          return_id: returnRecord.id,
          to_status: returnRecord.status,
          reason: 'Solicitação criada',
        }]);

      if (eventError) throw eventError;

      return returnRecord;
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "Solicitação de troca/devolução criada com sucesso!",
        });
      },
      invalidateKeys: [['returns', storeId]],
    }
  );

  const updateReturnStatusMutation = useSupabaseMutation(
    async ({ returnId, newStatus, reason }: { returnId: string; newStatus: string; reason?: string }) => {
      // Get current return
      const { data: currentReturn, error: fetchError } = await supabase
        .from('returns')
        .select('status')
        .eq('id', returnId)
        .single();

      if (fetchError) throw fetchError;

      // Update return status
      const { error: updateError } = await supabase
        .from('returns')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', returnId);

      if (updateError) throw updateError;

      // Create event
      const { error: eventError } = await supabase
        .from('return_events')
        .insert([{
          return_id: returnId,
          from_status: currentReturn.status,
          to_status: newStatus,
          reason: reason || `Status alterado para ${newStatus}`,
        }]);

      if (eventError) throw eventError;

      return { returnId, newStatus };
    },
    {
      onSuccess: (data) => {
        toast({
          title: "Status atualizado",
          description: `Status alterado para ${data.newStatus}`,
        });
      },
      invalidateKeys: [['returns', storeId]],
    }
  );

  return {
    returns: returnsQuery.data || [],
    isLoading: returnsQuery.isLoading,
    error: returnsQuery.error,
    createReturn: createReturnMutation.mutate,
    isCreating: createReturnMutation.isPending,
    updateStatus: updateReturnStatusMutation.mutate,
    isUpdatingStatus: updateReturnStatusMutation.isPending,
  };
};