import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, Save, Upload, Palette, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supportedLanguages } from '@/lib/translations';
import { useStore } from '@/hooks/useStores';
import { usePublicLinks, type PublicLinkTheme } from '@/hooks/usePublicLinks';

const ReturnsSetup = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();
  const { store, isLoading } = useStore(storeId!);
  const { config: publicConfig, loading: configLoading, saveConfig, uploadLogo, getPublicUrl } = usePublicLinks(storeId!, 'returns');
  
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
  
  const [theme, setTheme] = useState<PublicLinkTheme>({
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    backgroundColor: '#ffffff',
    textColor: '#1f2937'
  });
  
  const [returnsLanguage, setReturnsLanguage] = useState('pt');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Load config from database when available
  useEffect(() => {
    if (publicConfig) {
      const rules = publicConfig.auto_rules || {};
      setConfig(prev => ({
        ...prev,
        ...rules,
        mensagemPt: publicConfig.messages?.pt || prev.mensagemPt,
        mensagemEn: publicConfig.messages?.en || prev.mensagemEn,
        mensagemEs: publicConfig.messages?.es || prev.mensagemEs
      }));
      
      // Load theme if available
      if (rules.theme) {
        setTheme(rules.theme);
        setLogoPreview(rules.theme.logoUrl);
      }
      
      // Load language
      if (rules.language) {
        setReturnsLanguage(rules.language);
      }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-6 w-full max-w-4xl mx-auto p-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
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

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        setLogoPreview(previewUrl);
        setTheme(prev => ({ ...prev, logoUrl: previewUrl }));
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Logo carregada",
        description: "Logo foi carregada e será enviada ao salvar as configurações",
      });
    }
  };

  const handleSave = async () => {
    try {
      toast({
        title: "Salvando...",
        description: "Salvando configurações do portal público",
      });

      let logoUrl = theme.logoUrl;
      
      // Upload logo if a new file was selected
      if (logoFile) {
        toast({
          title: "Enviando logo...",
          description: "Fazendo upload da nova logo",
        });
        logoUrl = await uploadLogo(logoFile);
        setTheme(prev => ({ ...prev, logoUrl }));
      }

      // Generate clean slug from store name
      const cleanSlug = store.name
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .trim();

      await saveConfig({
        slug: cleanSlug, // Always update to clean slug
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
        theme: {
          ...theme,
          logoUrl
        },
        language: returnsLanguage,
        enabled: true
      });
      
      // Clear logo file after successful upload
      setLogoFile(null);
      
      toast({
        title: "Configurações salvas!",
        description: `Portal configurado com sucesso. Idioma: ${returnsLanguage === 'pt' ? 'Português' : returnsLanguage === 'en' ? 'English' : 'Español'}`,
      });
    } catch (error) {
      // Error handled in saveConfig
    }
  };

  const handlePreview = () => {
    window.open(publicUrl, '_blank');
  };

  // Generate preview styles for the preview card
  const previewStyles = {
    '--primary-color': theme.primaryColor,
    '--secondary-color': theme.secondaryColor,
    '--background-color': theme.backgroundColor,
    '--text-color': theme.textColor
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="self-start">
              <Link to={`/store/${storeId}/returns`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Portal de Trocas & Devoluções
              </h1>
              <p className="text-muted-foreground text-lg">{store.name}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* URL Section */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  URL do Portal Público
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Input 
                    value={publicUrl} 
                    readOnly 
                    className="flex-1 text-foreground bg-background/50 font-mono text-sm" 
                  />
                  <Button size="sm" onClick={handleCopyUrl} className="w-full sm:w-auto">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <Badge variant="outline" className="text-foreground">
                  {publicConfig?.slug ? `Slug: ${publicConfig.slug}` : 'URL será gerada automaticamente'}
                </Badge>
              </CardContent>
            </Card>

            {/* Visual Customization */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                  <Palette className="h-5 w-5" />
                  Personalização Visual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div>
                  <Label className="text-foreground text-sm font-medium">Logo da Loja</Label>
                  <div className="mt-3 space-y-4">
                    {logoPreview && (
                      <div className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-border/50">
                        <img src={logoPreview} alt="Logo preview" className="h-16 w-auto rounded border" />
                        <Button variant="outline" size="sm" onClick={() => {
                          setLogoPreview(null);
                          setLogoFile(null);
                          setTheme(prev => ({ ...prev, logoUrl: undefined }));
                          toast({
                            title: "Logo removida",
                            description: "Logo foi removida do preview",
                          });
                        }}>
                          Remover
                        </Button>
                      </div>
                    )}
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-6 hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload" className="cursor-pointer block text-center">
                        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          Clique para fazer upload da logo
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG ou SVG (máx. 5MB)
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Color Customization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground text-sm font-medium">Cor Principal</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          setTheme({...theme, primaryColor: newColor});
                          toast({
                            title: "Cor atualizada",
                            description: "Cor principal atualizada no preview",
                          });
                        }}
                        className="w-12 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({...theme, primaryColor: e.target.value})}
                        className="flex-1 font-mono text-sm"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground text-sm font-medium">Cor Secundária</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        value={theme.secondaryColor}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          setTheme({...theme, secondaryColor: newColor});
                        }}
                        className="w-12 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={theme.secondaryColor}
                        onChange={(e) => setTheme({...theme, secondaryColor: e.target.value})}
                        className="flex-1 font-mono text-sm"
                        placeholder="#1e40af"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground text-sm font-medium">Cor de Fundo</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        value={theme.backgroundColor}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          setTheme({...theme, backgroundColor: newColor});
                        }}
                        className="w-12 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={theme.backgroundColor}
                        onChange={(e) => setTheme({...theme, backgroundColor: e.target.value})}
                        className="flex-1 font-mono text-sm"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground text-sm font-medium">Cor do Texto</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        value={theme.textColor}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          setTheme({...theme, textColor: newColor});
                        }}
                        className="w-12 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        value={theme.textColor}
                        onChange={(e) => setTheme({...theme, textColor: e.target.value})}
                        className="flex-1 font-mono text-sm"
                        placeholder="#1f2937"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automation Settings */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Configurações de Automação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex-1">
                    <Label htmlFor="aprovarAuto" className="text-foreground font-medium">Aprovação Automática</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aprovar automaticamente solicitações dentro das regras
                    </p>
                  </div>
                  <Switch
                    checked={config.aprovarAuto}
                    onCheckedChange={(checked) => setConfig({...config, aprovarAuto: checked})}
                  />
                </div>

                <div>
                  <Label className="text-foreground text-sm font-medium">Logística Reversa</Label>
                  <Select value={config.logisticaReversa} onValueChange={(value) => setConfig({...config, logisticaReversa: value})}>
                    <SelectTrigger className="mt-2 text-foreground">
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="etiqueta" className="text-foreground">Gerar etiqueta automaticamente</SelectItem>
                      <SelectItem value="manual" className="text-foreground">Instruções manuais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Eligibility Rules */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Regras de Elegibilidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="janela" className="text-foreground text-sm font-medium">Prazo para Devolução (dias)</Label>
                    <Input
                      id="janela"
                      type="number"
                      value={config.janelaDias}
                      onChange={(e) => setConfig({...config, janelaDias: parseInt(e.target.value) || 15})}
                      min="1"
                      max="365"
                      className="mt-2"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <Label htmlFor="valorMinimo" className="text-foreground text-sm font-medium">Valor Mínimo (R$)</Label>
                    <Input
                      id="valorMinimo"
                      type="number"
                      value={config.valorMinimo}
                      onChange={(e) => setConfig({...config, valorMinimo: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                      className="mt-2"
                      placeholder="50.00"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex-1">
                    <Label htmlFor="exigirFotos" className="text-foreground font-medium">Exigir Fotos</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Obrigar anexar fotos do produto
                    </p>
                  </div>
                  <Switch
                    checked={config.exigirFotos}
                    onCheckedChange={(checked) => setConfig({...config, exigirFotos: checked})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Language and Messages */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Idioma e Mensagens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground text-sm font-medium">Idioma Principal</Label>
                    <Select value={returnsLanguage} onValueChange={setReturnsLanguage}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedLanguages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-foreground text-sm font-medium">Mensagem de Confirmação</Label>
                    <Textarea
                      value={config.mensagemPt}
                      onChange={(e) => setConfig({ ...config, mensagemPt: e.target.value })}
                      className="mt-2 min-h-[80px]"
                      placeholder="Sua solicitação foi recebida e está sendo analisada..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="xl:col-span-1">
            <div className="sticky top-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-foreground">Preview em Tempo Real</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="rounded-lg border border-border/50 overflow-hidden shadow-inner"
                    style={previewStyles}
                  >
                    <div 
                      className="p-6 space-y-6 min-h-[500px]"
                      style={{
                        backgroundColor: theme.backgroundColor,
                        color: theme.textColor
                      }}
                    >
                      {/* Header with logo */}
                      <div className="text-center space-y-4">
                        {logoPreview && (
                          <div className="flex justify-center">
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="h-12 w-auto"
                            />
                          </div>
                        )}
                        <div>
                          <h1 
                            className="text-2xl font-bold"
                            style={{ color: theme.primaryColor }}
                          >
                            Trocas & Devoluções
                          </h1>
                          <p className="text-sm opacity-80">Portal público da {store.name}</p>
                        </div>
                      </div>

                      {/* Form preview */}
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-lg font-semibold mb-3">Solicitar Troca ou Devolução</h2>
                          <p className="text-sm opacity-80 mb-4">
                            Preencha os dados abaixo para solicitar a troca ou devolução do seu produto.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium block mb-1">Número do Pedido</label>
                            <div className="h-9 bg-white/10 rounded border border-white/20"></div>
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">E-mail do Pedido</label>
                            <div className="h-9 bg-white/10 rounded border border-white/20"></div>
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">Nome Completo</label>
                            <div className="h-9 bg-white/10 rounded border border-white/20"></div>
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">Tipo de Solicitação</label>
                            <div className="h-9 bg-white/10 rounded border border-white/20"></div>
                          </div>
                        </div>

                        <div 
                          className="h-10 rounded font-medium text-center flex items-center justify-center text-white"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          Enviar Solicitação
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsSetup;
