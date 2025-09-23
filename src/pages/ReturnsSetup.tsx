import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supportedLanguages } from '@/lib/translations';
import { useStore } from '@/hooks/useStores';
import { usePublicLinks } from '@/hooks/usePublicLinks';

const ReturnsSetup = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();
  const { store, isLoading } = useStore(storeId!);
  const { config: publicConfig, loading: configLoading, saveConfig, getPublicUrl } = usePublicLinks(storeId!, 'returns');
  
  const [config, setConfig] = useState({
    janelaDias: 15,
    valorMinimo: 50,
    exigirFotos: true,
    aprovarAuto: true,
    logisticaReversa: 'etiqueta',
    categoriasBloquadas: [] as string[],
    mensagemPt: 'Sua solicitação de troca/devolução foi recebida e está sendo analisada.',
    mensagemEn: 'Your return/exchange request has been received and is being reviewed.',
    mensagemEs: 'Su solicitud de devolución/cambio ha sido recibida y está siendo revisada.'
  });
  
  const [returnsLanguage, setReturnsLanguage] = useState('pt');

  // Load config from database when available
  useEffect(() => {
    if (publicConfig) {
      setConfig(prev => ({
        ...prev,
        ...publicConfig.auto_rules,
        mensagemPt: publicConfig.messages.pt || prev.mensagemPt,
        mensagemEn: publicConfig.messages.en || prev.mensagemEn,
        mensagemEs: publicConfig.messages.es || prev.mensagemEs
      }));
    }
  }, [publicConfig]);

  // Auto-save initial config when store loads
  useEffect(() => {
    if (store && !configLoading && !publicConfig) {
      handleSave();
    }
  }, [store, configLoading, publicConfig]);

  if (isLoading || configLoading) {
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

  const publicUrl = getPublicUrl(store.name);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "URL copiada!",
      description: "URL do link público copiada para a área de transferência",
    });
  };

  const handleSave = async () => {
    try {
      // Generate clean slug from store name
      const cleanSlug = store.name
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .trim();

      await saveConfig({
        slug: cleanSlug,
        storeName: store.name,
        auto_rules: {
          janelaDias: config.janelaDias,
          valorMinimo: config.valorMinimo,
          exigirFotos: config.exigirFotos,
          aprovarAuto: config.aprovarAuto,
          logisticaReversa: config.logisticaReversa,
          categoriasBloquadas: config.categoriasBloquadas
        },
        messages: {
          pt: config.mensagemPt,
          en: config.mensagemEn,
          es: config.mensagemEs
        },
        enabled: true
      });
    } catch (error) {
      // Error handled in saveConfig
    }
  };

  const handlePreview = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 space-y-6">{/* Mantendo mesmo padrão visual */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/store/${storeId}/returns`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurar Link Público</h1>
            <p className="text-muted-foreground">Trocas & Devoluções • {store.name}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Configuration */}
        <div className="space-y-4 sm:space-y-6">
          {/* URL */}
          <Card className="bg-card border-border shadow-sm">{/* Cards com fundo sólido */}
            <CardHeader>
              <CardTitle className="text-foreground">URL do Portal Público</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input value={publicUrl} readOnly className="flex-1 text-foreground" />
                <Button size="sm" onClick={handleCopyUrl} className="w-full sm:w-auto">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant="secondary" className="text-foreground">
                {publicConfig?.slug ? `Slug personalizado: ${publicConfig.slug}` : 'URL será gerada ao salvar configurações'}
              </Badge>
            </CardContent>
          </Card>

          {/* Language Configuration */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Idioma do Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="returnsLanguage" className="text-foreground">Idioma para Trocas e Devoluções</Label>
                <Select value={returnsLanguage} onValueChange={setReturnsLanguage}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code} className="text-foreground">
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Define o idioma que será exibido no formulário público de trocas e devoluções
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Eligibility Rules */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground">Regras de Elegibilidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="janela" className="text-foreground">Janela de devolução (dias)</Label>
                <Select value={config.janelaDias.toString()} onValueChange={(value) => setConfig({...config, janelaDias: parseInt(value)})}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="7" className="text-foreground">7 dias</SelectItem>
                    <SelectItem value="15" className="text-foreground">15 dias</SelectItem>
                    <SelectItem value="30" className="text-foreground">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="valorMinimo" className="text-foreground">Valor mínimo do pedido (R$)</Label>
                <Input
                  type="number"
                  value={config.valorMinimo}
                  onChange={(e) => setConfig({...config, valorMinimo: parseFloat(e.target.value)})}
                  placeholder="50.00"
                  className="text-foreground"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="exigirFotos" className="text-foreground">Exigir fotos dos produtos</Label>
                  <p className="text-sm text-muted-foreground">Obrigatório envio de fotos para análise</p>
                </div>
                <Switch
                  checked={config.exigirFotos}
                  onCheckedChange={(checked) => setConfig({...config, exigirFotos: checked})}
                />
              </div>

              <div>
                <Label className="text-foreground">Categorias bloqueadas</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Produtos destas categorias não poderão ser devolvidos
                </p>
                <Input placeholder="Digite categorias separadas por vírgula" className="text-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Automation */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground">Automação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="aprovarAuto" className="text-foreground">Aprovação automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Aprovar automaticamente se dentro da janela e com fotos
                  </p>
                </div>
                <Switch
                  checked={config.aprovarAuto}
                  onCheckedChange={(checked) => setConfig({...config, aprovarAuto: checked})}
                />
              </div>

              <div>
                <Label className="text-foreground">Logística reversa</Label>
                <Select value={config.logisticaReversa} onValueChange={(value) => setConfig({...config, logisticaReversa: value})}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="etiqueta" className="text-foreground">Gerar etiqueta (mock)</SelectItem>
                    <SelectItem value="manual" className="text-foreground">Instruções manuais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground">Mensagens Públicas</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pt" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 bg-muted">
                  <TabsTrigger value="pt" className="text-foreground data-[state=active]:text-foreground">Português</TabsTrigger>
                  <TabsTrigger value="en" className="text-foreground data-[state=active]:text-foreground">English</TabsTrigger>
                  <TabsTrigger value="es" className="text-foreground data-[state=active]:text-foreground">Español</TabsTrigger>
                </TabsList>

                <TabsContent value="pt" className="space-y-4">
                  <div>
                    <Label className="text-foreground">Mensagem de confirmação</Label>
                    <Textarea
                      value={config.mensagemPt}
                      onChange={(e) => setConfig({...config, mensagemPt: e.target.value})}
                      placeholder="Mensagem exibida após a solicitação"
                      rows={4}
                      className="text-foreground"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="en" className="space-y-4">
                  <div>
                    <Label className="text-foreground">Confirmation message</Label>
                    <Textarea
                      value={config.mensagemEn}
                      onChange={(e) => setConfig({...config, mensagemEn: e.target.value})}
                      placeholder="Message displayed after request"
                      rows={4}
                      className="text-foreground"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="es" className="space-y-4">
                  <div>
                    <Label className="text-foreground">Mensaje de confirmación</Label>
                    <Textarea
                      value={config.mensagemEs}
                      onChange={(e) => setConfig({...config, mensagemEs: e.target.value})}
                      placeholder="Mensaje mostrado después de la solicitud"
                      rows={4}
                      className="text-foreground"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground">Preview do Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
                <div className="h-8 bg-primary/20 rounded w-1/3"></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Preview" para ver o portal completo
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ReturnsSetup;