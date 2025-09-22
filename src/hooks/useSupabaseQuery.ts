import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSupabaseQuery = (
  key: string[],
  query: () => Promise<any>,
  options?: any
) => {
  return useQuery({
    queryKey: key,
    queryFn: query,
    ...options,
  });
};

export const useSupabaseMutation = (
  mutationFn: (data: any) => Promise<any>,
  options?: {
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    invalidateKeys?: string[][];
  }
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
      options?.onError?.(error);
    },
  });
};