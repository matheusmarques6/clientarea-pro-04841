import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PublicLinkConfig {
  id?: string;
  store_id?: string;
  type?: 'returns' | 'refunds';
  slug?: string;
  enabled?: boolean;
  auto_rules: any;
  messages: any;
  created_at?: string;
  updated_at?: string;
}

export const usePublicLinks = (storeId: string, type: 'returns' | 'refunds') => {
  const [config, setConfig] = useState<PublicLinkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('public_links')
        .select('*')
        .eq('store_id', storeId)
        .eq('type', type)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setConfig(data as any);
    } catch (err: any) {
      console.error('Error fetching public link config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updatedConfig: Partial<PublicLinkConfig>) => {
    try {
      const { data, error } = await supabase
        .from('public_links')
        .upsert({
          store_id: storeId,
          type,
          slug: `${storeId}-${type}`,
          ...updatedConfig
        } as any)
        .select()
        .single();

      if (error) throw error;

      setConfig(data as any);
      toast({
        title: "Configurações salvas",
        description: "Configurações do link público atualizadas com sucesso",
      });

      return data;
    } catch (err: any) {
      console.error('Error saving public link config:', err);
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const getPublicUrl = (storeName: string) => {
    if (config?.slug) {
      return `https://app.convertfy.me/public/${type}/${config.slug}`;
    }
    return `https://app.convertfy.me/public/${type}/${storeName.toLowerCase().replace(/\s+/g, '-')}`;
  };

  useEffect(() => {
    if (storeId && type) {
      fetchConfig();
    }
  }, [storeId, type]);

  return {
    config,
    loading,
    error,
    saveConfig,
    getPublicUrl,
    refetch: fetchConfig
  };
};