import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StoreSettings {
  // Integrations
  shopifyUrl?: string;
  shopifyToken?: string;
  klaviyoPublicKey?: string;
  klaviyoPrivateKey?: string;
  smsApiKey?: string;
  whatsappApiKey?: string;
  
  // Policies
  devolucaoJanela?: number;
  trocaJanela?: number;
  reembolsoJanela?: number;
  categoriasBloquadas?: string;
  enderecoColeta?: string;
  
  // Templates
  emailTrocaAprovada?: string;
  emailDevolucaoAprovada?: string;
  emailReembolsoAprovado?: string;
  smsNotificacao?: string;
  whatsappTemplate?: string;
}

export const useStoreSettings = (storeId: string) => {
  const [settings, setSettings] = useState<StoreSettings>({
    // Default values
    devolucaoJanela: 15,
    trocaJanela: 30,
    reembolsoJanela: 7,
    categoriasBloquadas: 'Produtos digitais, Produtos personalizados',
    enderecoColeta: 'Rua das Flores, 123 - Centro - São Paulo/SP - 01234-567',
    emailTrocaAprovada: 'Sua solicitação de troca foi aprovada! Em breve você receberá as instruções de postagem.',
    emailDevolucaoAprovada: 'Sua solicitação de devolução foi aprovada! Em breve você receberá as instruções de postagem.',
    emailReembolsoAprovado: 'Seu reembolso foi aprovado e está sendo processado. O valor será creditado em até 5 dias úteis.',
    smsNotificacao: 'Convertfy: Sua solicitação #{id} foi atualizada para: {status}',
    whatsappTemplate: 'Olá! Sua solicitação #{id} foi atualizada para: {status}. Acesse o link para mais detalhes.',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch store data directly
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('shopify_domain, shopify_access_token, klaviyo_private_key, klaviyo_site_id')
        .eq('id', storeId)
        .single();

      console.log('Fetched store data:', { store, storeError, storeId });

      if (storeError) {
        throw storeError;
      }

      if (store) {
        const newSettings = {
          ...settings,
          shopifyUrl: store.shopify_domain || '',
          shopifyToken: store.shopify_access_token ? '••••••••••••••••••••••••••••••••' : '',
          klaviyoPublicKey: store.klaviyo_site_id || '',
          klaviyoPrivateKey: store.klaviyo_private_key ? '••••••••••••••••••••••••••••••••' : '',
        };
        
        console.log('Setting new settings:', newSettings);
        setSettings(newSettings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Error fetching store settings:', err);
      
      if (!errorMessage.includes('JWT') && !errorMessage.includes('token')) {
        toast({
          title: "Erro ao carregar configurações",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: StoreSettings) => {
    try {
      console.log('Saving settings for store:', storeId);
      console.log('Current user:', (await supabase.auth.getUser()).data?.user?.email);
      console.log('New settings:', newSettings);
      
      // Prepare update object for stores table
      const storeUpdate: any = {};
      
      // Only update fields that are not masked (••••••••••••••••••••••••••••••••)
      if (newSettings.shopifyUrl !== undefined) {
        storeUpdate.shopify_domain = newSettings.shopifyUrl || null;
      }
      
      if (newSettings.shopifyToken && newSettings.shopifyToken !== '••••••••••••••••••••••••••••••••') {
        storeUpdate.shopify_access_token = newSettings.shopifyToken || null;
      }
      
      if (newSettings.klaviyoPublicKey !== undefined) {
        storeUpdate.klaviyo_site_id = newSettings.klaviyoPublicKey || null;
      }
      
      if (newSettings.klaviyoPrivateKey && newSettings.klaviyoPrivateKey !== '••••••••••••••••••••••••••••••••') {
        storeUpdate.klaviyo_private_key = newSettings.klaviyoPrivateKey || null;
      }
      
      console.log('Store update object:', storeUpdate);
      
      // Update stores table
      if (Object.keys(storeUpdate).length > 0) {
        // First verify we can access the store
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id, name')
          .eq('id', storeId)
          .single();
          
        console.log('Store access check:', { storeData, storeError });
        
        if (storeError) {
          throw new Error(`Cannot access store: ${storeError.message}`);
        }
        
        // Now perform the update
        const { error } = await supabase
          .from('stores')
          .update(storeUpdate)
          .eq('id', storeId);
          
        console.log('Update error (if any):', error);
          
        if (error) {
          throw error;
        }
        
        // Verify the update by fetching the updated data
        const { data: updatedStore, error: fetchError } = await supabase
          .from('stores')
          .select('shopify_domain, klaviyo_site_id')
          .eq('id', storeId)
          .single();
          
        console.log('Updated store data:', { updatedStore, fetchError });
        
        if (fetchError) {
          console.warn('Could not verify update:', fetchError);
        }
      } else {
        console.log('No fields to update');
      }
      
      toast({
        title: "Configurações salvas",
        description: "Credenciais da loja atualizadas com sucesso!",
      });
      
      // Update local state immediately with the new values
      setSettings(newSettings);
      
      // Refresh settings to show masked values after a short delay
      setTimeout(() => {
        fetchSettings();
      }, 500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error saving settings:', err);
      
      toast({
        title: "Erro ao salvar configurações",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchSettings();
    }
  }, [storeId]);

  return {
    settings,
    setSettings,
    loading,
    error,
    saveSettings,
    refetch: fetchSettings,
  };
};