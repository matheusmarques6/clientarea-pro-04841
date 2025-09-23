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
      
      // Fetch integrations
      const { data: integrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('store_id', storeId);

      // Create settings object from integrations
      const integrationsSettings: Partial<StoreSettings> = {};
      
      integrations?.forEach(integration => {
        switch (integration.provider) {
          case 'shopify':
            integrationsSettings.shopifyUrl = integration.extra && typeof integration.extra === 'object' && 'url' in integration.extra ? integration.extra.url as string : '';
            integrationsSettings.shopifyToken = integration.key_secret_encrypted ? '••••••••••••••••••••••••••••••••' : '';
            break;
          case 'klaviyo':
            integrationsSettings.klaviyoPublicKey = integration.key_public || '';
            integrationsSettings.klaviyoPrivateKey = integration.key_secret_encrypted ? '••••••••••••••••••••••••••••••••' : '';
            break;
          case 'sms':
            integrationsSettings.smsApiKey = integration.key_secret_encrypted ? '••••••••••••••••••••••••••••••••' : '';
            break;
          case 'whatsapp':
            integrationsSettings.whatsappApiKey = integration.key_secret_encrypted ? '••••••••••••••••••••••••••••••••' : '';
            break;
        }
      });

      setSettings(prev => ({ ...prev, ...integrationsSettings }));
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
      setSettings(newSettings);
      
      // Upsert integrations
      const integrations = [];
      
      // Shopify integration
      if (newSettings.shopifyUrl || newSettings.shopifyToken) {
        integrations.push({
          store_id: storeId,
          provider: 'shopify',
          key_public: newSettings.shopifyUrl,
          key_secret_encrypted: newSettings.shopifyToken === '••••••••••••••••••••••••••••••••' ? undefined : newSettings.shopifyToken,
          extra: { url: newSettings.shopifyUrl },
          status: (newSettings.shopifyUrl && newSettings.shopifyToken) ? 'connected' : 'disconnected'
        });
      }
      
      // Klaviyo integration
      if (newSettings.klaviyoPublicKey || newSettings.klaviyoPrivateKey) {
        integrations.push({
          store_id: storeId,
          provider: 'klaviyo',
          key_public: newSettings.klaviyoPublicKey?.startsWith('pk_') ? newSettings.klaviyoPublicKey : newSettings.klaviyoPublicKey,
          key_secret_encrypted: newSettings.klaviyoPrivateKey === '••••••••••••••••••••••••••••••••' ? undefined : newSettings.klaviyoPrivateKey,
          status: (newSettings.klaviyoPublicKey && newSettings.klaviyoPrivateKey) ? 'connected' : 'disconnected'
        });
      }
      
      // SMS integration
      if (newSettings.smsApiKey) {
        integrations.push({
          store_id: storeId,
          provider: 'sms',
          key_secret_encrypted: newSettings.smsApiKey === '••••••••••••••••••••••••••••••••' ? undefined : newSettings.smsApiKey,
          status: newSettings.smsApiKey ? 'connected' : 'disconnected'
        });
      }
      
      // WhatsApp integration
      if (newSettings.whatsappApiKey) {
        integrations.push({
          store_id: storeId,
          provider: 'whatsapp',
          key_secret_encrypted: newSettings.whatsappApiKey === '••••••••••••••••••••••••••••••••' ? undefined : newSettings.whatsappApiKey,
          status: newSettings.whatsappApiKey ? 'connected' : 'disconnected'
        });
      }
      
      // Save integrations to database
      for (const integration of integrations) {
        const { error } = await supabase
          .from('integrations')
          .upsert(integration, {
            onConflict: 'store_id,provider'
          });
          
        if (error) {
          throw error;
        }
      }
      
      toast({
        title: "Configurações salvas",
        description: "Todas as configurações foram atualizadas com sucesso no banco de dados",
      });
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