import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Save, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStores';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { supabase } from '@/integrations/supabase/client';

const StoreSettings = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();
  const { store, isLoading } = useStore(storeId!);
  const { settings, setSettings, loading: settingsLoading, saveSettings } = useStoreSettings(storeId!);
  const [showTokens, setShowTokens] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeCurrency, setStoreCurrency] = useState('BRL');
  const [storeLanguage, setStoreLanguage] = useState('pt-BR');
  
  useEffect(() => {
    if (store) {
      setStoreName(store.name);
      setStoreCurrency(store.currency || 'BRL');
      // TODO: Adicionar campo de idioma na tabela stores
      setStoreLanguage('pt-BR');
    }
  }, [store]);
  
  if (isLoading || settingsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loja não encontrada</h2>
          <p className="text-muted-foreground mb-4">A loja solicitada não foi encontrada ou você não tem permissão para acessá-la.</p>
          <Button asChild>
            <Link to="/stores">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às lojas
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      // Salvar configurações da loja (nome, moeda, idioma)
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          name: storeName,
          currency: storeCurrency,
          // TODO: Adicionar campo language quando disponível
        })
        .eq('id', storeId);
        
      if (updateError) throw updateError;
      
      // Salvar outras configurações (integrações, etc)
      await saveSettings(settings);
      
      toast({
        title: "Configurações salvas",
        description: "As configurações da loja foram atualizadas com sucesso!",
      });
    } catch (error) {
      console.error('Error saving store settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  const toggleTokenVisibility = () => {
    setShowTokens(!showTokens);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          {/* Configurações Gerais da Loja */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Informações da Loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="storeName">Nome da Loja</Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Nome da sua loja"
                />
              </div>
              <div>
                <Label htmlFor="storeCurrency">Moeda</Label>
                <Select value={storeCurrency} onValueChange={setStoreCurrency}>
                  <SelectTrigger id="storeCurrency">
                    <SelectValue placeholder="Selecione a moeda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL - Real Brasileiro (R$)</SelectItem>
                    <SelectItem value="USD">USD - Dólar Americano ($)</SelectItem>
                    <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                    <SelectItem value="GBP">GBP - Libra Esterlina (£)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta moeda será usada em todos os relatórios e dashboards
                </p>
              </div>
              <div>
                <Label htmlFor="storeLanguage">Idioma Padrão</Label>
                <Select value={storeLanguage} onValueChange={setStoreLanguage}>
                  <SelectTrigger id="storeLanguage">
                    <SelectValue placeholder="Selecione o idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Idioma usado para comunicação com clientes
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          {/* Shopify */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Shopify</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shopifyUrl">URL da Loja</Label>
                  <Input
                    id="shopifyUrl"
                    value={settings.shopifyUrl || ''}
                    onChange={(e) => setSettings({...settings, shopifyUrl: e.target.value})}
                    placeholder="minhaloja.myshopify.com"
                  />
              </div>
              <div>
                <Label htmlFor="shopifyToken">Access Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="shopifyToken"
                    type={showTokens ? "text" : "password"}
                    value={settings.shopifyToken || ''}
                    onChange={(e) => setSettings({...settings, shopifyToken: e.target.value})}
                    placeholder="shpat_..."
                  />
                  <Button variant="outline" size="sm" onClick={toggleTokenVisibility}>
                    {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Klaviyo */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Klaviyo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="klaviyoPublic">Chave de API Pública/ID do Site</Label>
                <Input
                  id="klaviyoPublic"
                  type={showTokens ? "text" : "password"}
                  value={settings.klaviyoPublicKey || ''}
                  onChange={(e) => setSettings({...settings, klaviyoPublicKey: e.target.value})}
                  placeholder="pk_... ou ID do site"
                />
              </div>
              <div>
                <Label htmlFor="klaviyoPrivate">Chave de API Privada</Label>
                <div className="flex gap-2">
                  <Input
                    id="klaviyoPrivate"
                    type={showTokens ? "text" : "password"}
                    value={settings.klaviyoPrivateKey || ''}
                    onChange={(e) => setSettings({...settings, klaviyoPrivateKey: e.target.value})}
                    placeholder="pk_..."
                  />
                  <Button variant="outline" size="sm" onClick={toggleTokenVisibility}>
                    {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Comunicação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="smsApi">SMS API Key</Label>
                <Input
                  id="smsApi"
                  type={showTokens ? "text" : "password"}
                  value={settings.smsApiKey || ''}
                  onChange={(e) => setSettings({...settings, smsApiKey: e.target.value})}
                  placeholder="API Key do provedor de SMS"
                />
              </div>
              <div>
                <Label htmlFor="whatsappApi">WhatsApp API Key</Label>
                <Input
                  id="whatsappApi"
                  type={showTokens ? "text" : "password"}
                  value={settings.whatsappApiKey || ''}
                  onChange={(e) => setSettings({...settings, whatsappApiKey: e.target.value})}
                  placeholder="API Key do WhatsApp Business"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          {/* Return Windows */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Janelas de Tempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="devolucaoJanela">Devolução (dias)</Label>
                  <Input
                    id="devolucaoJanela"
                    type="number"
                    value={settings.devolucaoJanela || 15}
                    onChange={(e) => setSettings({...settings, devolucaoJanela: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="trocaJanela">Troca (dias)</Label>
                  <Input
                    id="trocaJanela"
                    type="number"
                    value={settings.trocaJanela || 30}
                    onChange={(e) => setSettings({...settings, trocaJanela: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="reembolsoJanela">Reembolso (dias)</Label>
                  <Input
                    id="reembolsoJanela"
                    type="number"
                    value={settings.reembolsoJanela || 7}
                    onChange={(e) => setSettings({...settings, reembolsoJanela: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restrictions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Restrições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="categoriasBloquadas">Categorias Bloqueadas</Label>
                <Textarea
                  id="categoriasBloquadas"
                  value={settings.categoriasBloquadas || ''}
                  onChange={(e) => setSettings({...settings, categoriasBloquadas: e.target.value})}
                  placeholder="Liste as categorias que não permitem troca/devolução"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="enderecoColeta">Endereço de Coleta</Label>
                <Textarea
                  id="enderecoColeta"
                  value={settings.enderecoColeta || ''}
                  onChange={(e) => setSettings({...settings, enderecoColeta: e.target.value})}
                  placeholder="Endereço completo para coleta dos produtos"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {/* Email Templates */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Templates de E-mail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emailTroca">Troca Aprovada</Label>
                <Textarea
                  id="emailTroca"
                  value={settings.emailTrocaAprovada || ''}
                  onChange={(e) => setSettings({...settings, emailTrocaAprovada: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="emailDevolucao">Devolução Aprovada</Label>
                <Textarea
                  id="emailDevolucao"
                  value={settings.emailDevolucaoAprovada || ''}
                  onChange={(e) => setSettings({...settings, emailDevolucaoAprovada: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="emailReembolso">Reembolso Aprovado</Label>
                <Textarea
                  id="emailReembolso"
                  value={settings.emailReembolsoAprovado || ''}
                  onChange={(e) => setSettings({...settings, emailReembolsoAprovado: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* SMS/WhatsApp Templates */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Templates SMS/WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="smsTemplate">SMS Notificação</Label>
                <Textarea
                  id="smsTemplate"
                  value={settings.smsNotificacao || ''}
                  onChange={(e) => setSettings({...settings, smsNotificacao: e.target.value})}
                  rows={2}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Variáveis: {"{id}"}, {"{status}"}
                </p>
              </div>
              <div>
                <Label htmlFor="whatsappTemplate">WhatsApp Template</Label>
                <Textarea
                  id="whatsappTemplate"
                  value={settings.whatsappTemplate || ''}
                  onChange={(e) => setSettings({...settings, whatsappTemplate: e.target.value})}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Variáveis: {"{id}"}, {"{status}"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StoreSettings;