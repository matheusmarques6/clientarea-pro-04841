import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PublicLinkTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  lineColor?: string;
  lineWidth?: number;
  logoUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroDescription?: string;
  heroButtonText?: string;
  heroButtonColor?: string;
  heroButtonAlignment?: "left" | "center" | "right";
  heroButtonRadius?: number;
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

      // First, check if a record already exists for this store + type
      let { data: existingRecord, error: fetchError } = await supabase
        .from('public_links')
        .select('*')
        .eq('store_id', storeId)
        .eq('type', type)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when not found

      console.log('Existing record check:', { existingRecord, fetchError, storeId, type });

      // If no record found by store_id, check by slug alone
      if (!existingRecord) {
        const baseSlug = generateSlug(updatedConfig.storeName || 'store');

        // Check for ANY record with this slug (ignore store_id AND type for now)
        const { data: allSlugs } = await supabase
          .from('public_links')
          .select('*')
          .eq('slug', baseSlug);

        console.log('Slug check for:', baseSlug, 'All matching records:', allSlugs);

        // Find one matching our type
        const slugCheck = allSlugs?.find(r => r.type === type);

        // If we found a record by slug, we'll update it and fix the store_id
        if (slugCheck) {
          console.log('Found existing record by slug! Using it for UPDATE and fixing store_id');
          existingRecord = slugCheck;
        } else if (allSlugs && allSlugs.length > 0) {
          console.log('WARNING: Found slug with different type:', allSlugs[0].type);
        }
      }

      // Check for existing slugs and add number if needed
      const getUniqueSlug = async (baseSlug: string, currentId?: string): Promise<string> => {
        let finalSlug = baseSlug;
        let counter = 1;

        while (true) {
          let query = supabase
            .from('public_links')
            .select('id')
            .eq('slug', finalSlug)
            .eq('type', type);

          // Exclude current record if updating
          if (currentId) {
            query = query.neq('id', currentId);
          }

          const { data: existing } = await query;

          // If no records found or only found current record, slug is unique
          if (!existing || existing.length === 0) {
            break;
          }

          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        return finalSlug;
      };

      let baseSlug = updatedConfig.slug || generateSlug(updatedConfig.storeName || 'store');

      // Add suffix for refunds to avoid conflicts with returns
      if (type === 'refunds' && !updatedConfig.slug) {
        baseSlug = `${baseSlug}-refunds`;
      }

      console.log('Base slug:', baseSlug);

      // Always check for unique slug, even for updates, in case storeName changed
      const finalSlug = await getUniqueSlug(baseSlug, existingRecord?.id);
      console.log('Final slug:', finalSlug, 'Existing ID:', existingRecord?.id);

      // Merge auto_rules properly to avoid data loss
      const mergedAutoRules = {
        ...(existingRecord?.auto_rules || config?.auto_rules || {}),  // Start with existing rules from DB
        ...(updatedConfig.auto_rules || {}),  // Override with new rules from update
        ...(updatedConfig.theme && { theme: updatedConfig.theme }), // Add theme if provided
        ...(updatedConfig.language && { language: updatedConfig.language }) // Add language if provided
      };

      const payload = {
        store_id: storeId,
        type,
        slug: finalSlug,
        auto_rules: mergedAutoRules,
        messages: updatedConfig.messages,
        enabled: updatedConfig.enabled,
      };

      let data, error;

      if (existingRecord?.id) {
        // Update existing record
        console.log('UPDATING existing record with ID:', existingRecord.id);
        const result = await supabase
          .from('public_links')
          .update(payload)
          .eq('id', existingRecord.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Insert new record
        console.log('INSERTING new record');
        const result = await supabase
          .from('public_links')
          .insert(payload)
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      console.log('Result:', { data, error });

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

  const getPublicUrl = (storeName: string): string | null => {
    const baseUrl = window.location.origin;
    if (config?.slug) {
      // Use different paths based on type
      const path = type === 'returns' ? 'formulario' : 'public/refunds';
      return `${baseUrl}/${path}/${config.slug}`;
    }
    // No fallback - user must save config first to get a valid URL
    return null;
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
