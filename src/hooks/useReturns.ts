import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ReturnStatus = 'new' | 'review' | 'approved' | 'awaiting_post' | 'received_dc' | 'closed' | 'rejected';

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
  amount: number;
  status: ReturnStatus;
  origin: string;
  created_at: string;
  updated_at: string;
  code?: string;
  sla_days?: number;
  return_items?: ReturnItem[];
  return_events?: ReturnEvent[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  sku?: string;
  title?: string;
  variant?: string;
  qty: number;
  unit_price: number;
}

export interface ReturnEvent {
  id: string;
  return_id: string;
  from_status?: ReturnStatus;
  to_status: ReturnStatus;
  reason?: string;
  user_id?: string;
  created_at: string;
}

export interface CreateReturnData {
  order_code: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  type: string;
  reason?: string;
  notes?: string;
  amount?: number;
  origin?: string;
  items: Partial<ReturnItem>[];
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
    async (returnData: CreateReturnData) => {
      const { items, ...returnInfo } = returnData;
      
      // Create return with proper typing - casting to any to bypass type issues
      const returnRecord: any = {
        store_id: storeId,
        order_code: returnInfo.order_code,
        customer_name: returnInfo.customer_name,
        customer_email: returnInfo.customer_email,
        customer_phone: returnInfo.customer_phone,
        type: returnInfo.type,
        reason: returnInfo.reason,
        notes: returnInfo.notes,
        amount: returnInfo.amount || 0,
        origin: returnInfo.origin || 'internal',
        status: 'new',
      };

      const { data: insertedReturn, error: returnError } = await supabase
        .from('returns')
        .insert([returnRecord])
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(
            items.map(item => ({
              return_id: insertedReturn.id,
              sku: item.sku,
              title: item.title,
              variant: item.variant,
              qty: item.qty || 1,
              unit_price: item.unit_price || 0,
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Create initial event
      const { error: eventError } = await supabase
        .from('return_events')
        .insert([{
          return_id: insertedReturn.id,
          to_status: 'new',
          reason: 'Solicitação criada',
        } as any]);

      if (eventError) throw eventError;

      return insertedReturn;
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
    async ({ returnId, newStatus, reason }: { returnId: string; newStatus: ReturnStatus; reason?: string }) => {
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
        .update({ status: newStatus as any, updated_at: new Date().toISOString() })
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
        } as any]);

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