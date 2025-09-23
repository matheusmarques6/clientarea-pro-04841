import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PublicLinkTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
}

export interface PublicLinkConfig {
  id?: string;
  store_id?: string;
  type?: 'returns' | 'refunds';
  slug?: string;
  enabled?: boolean;
  auto_rules: any;
  messages: any;
  theme?: PublicLinkTheme;
  language?: string;
  created_at?: string;
  updated_at?: string;
  storeName?: string;
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

  const uploadLogo = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}/logo.${fileExt}`;
      
      // Delete existing logo if any
      await supabase.storage.from('store-logos').remove([fileName]);
      
      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      throw err;
    }
  };

  const saveConfig = async (updatedConfig: Partial<PublicLinkConfig>) => {
    try {
      // Generate a nice slug from store name if not provided
      const generateSlug = (storeName: string) => {
        return storeName
          .toLowerCase()
          .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .trim();
      };

      // Check for existing slugs and add number if needed
      const getUniqueSlug = async (baseSlug: string): Promise<string> => {
        let finalSlug = baseSlug;
        let counter = 1;
        
        while (true) {
          const { data: existing } = await supabase
            .from('public_links')
            .select('id')
            .eq('slug', finalSlug)
            .eq('type', type)
            .neq('store_id', storeId)
            .single();
          
          if (!existing) {
            break; // Slug is unique
          }
          
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        return finalSlug;
      };

      const baseSlug = updatedConfig.slug || generateSlug(updatedConfig.storeName || 'store');
      
      // For existing configs, always use the provided slug to allow updates
      const finalSlug = config?.id ? baseSlug : await getUniqueSlug(baseSlug);

      const { data, error } = await supabase
        .from('public_links')
        .upsert({
          id: config?.id, // Include ID for updates
          store_id: storeId,
          type,
          slug: finalSlug,
          auto_rules: updatedConfig.auto_rules,
          messages: updatedConfig.messages,
          enabled: updatedConfig.enabled,
          // Store theme and language in auto_rules for now (can be separate columns later)
          ...(updatedConfig.theme && { 
            auto_rules: { 
              ...updatedConfig.auto_rules, 
              theme: updatedConfig.theme,
              language: updatedConfig.language 
            } 
          })
        } as any)
        .select()
        .single();

      if (error) throw error;

      setConfig(data as any);
      toast({
        title: "Configurações salvas",
        description: `Configurações salvas com slug: ${finalSlug}`,
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
    // Generate clean slug from store name as fallback
    const cleanSlug = storeName
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    return `https://app.convertfy.me/public/${type}/${cleanSlug}`;
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
    uploadLogo,
    getPublicUrl,
    refetch: fetchConfig
  };
};