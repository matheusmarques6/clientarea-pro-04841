import { useState } from 'react';
import { ArrowLeft, Copy, Eye, Palette, Settings, MessageSquare, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const RefundsSetup = () => {
  const { toast } = useToast();
  
  // Configuration state
  const [config, setConfig] = useState({
    // Critérios
    arrependimentoDays: 7,
    defeitoDays: 30,
    autoApproveLimit: 100,
    requirePhotosForDefect: true,
    prioritizeVoucher: true,
    voucherBonus: 10,
    
    // Métodos
    enableCard: true,
    enablePix: true,
    enableBoleto: false,
    enableVoucher: true,
    pixValidation: 'any',
    
    // Aparência
    storeLogo: '',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    borderRadius: 8,
    formWidth: 'comfy',
    showSidebar: true,
    colorMode: 'light',
    
    // Mensagens
    welcomeTitle: 'Precisa de reembolso?',
    welcomeSubtitle: 'Vamos te ajudar com sua solicitação.',
    policy: 'Nossa política de reembolso permite devoluções em até 7 dias para arrependimento e 30 dias para produtos com defeito.',
    
    // Idioma
    language: 'pt',
  });

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "As configurações do portal de reembolsos foram atualizadas com sucesso.",
    });
  };

  const handleCopyPublicLink = () => {
    const publicLink = 'https://loja.com/refunds';
    navigator.clipboard.writeText(publicLink);
    toast({
      title: "Link copiado",
      description: "Link público do portal de reembolsos copiado para a área de transferência",
    });
  };

  const handlePreview = () => {
    window.open('/refunds/loja-demo', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to="/store/1/refunds">
              <Button variant="ghost" size="sm" className="hover:bg-muted">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Voltar para reembolsos</span>
                <span className="sm:hidden">Voltar</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Configurações de Reembolsos</h1>
              <p className="text-muted-foreground">Configure o portal público e as regras de negócio</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyPublicLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </Button>
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave}>
              Salvar configurações
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="criteria" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="criteria" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Critérios
            </TabsTrigger>
            <TabsTrigger value="methods" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Métodos
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagens
            </TabsTrigger>
          </TabsList>

          {/* Critérios Tab */}
          <TabsContent value="criteria" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Janelas de Elegibilidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="arrependimentoDays">Arrependimento (dias após recebimento)</Label>
                    <Input
                      id="arrependimentoDays"
                      type="number"
                      value={config.arrependimentoDays}
                      onChange={(e) => handleConfigChange('arrependimentoDays', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="defeitoDays">Defeito/Danificado (dias após recebimento)</Label>
                    <Input
                      id="defeitoDays"
                      type="number"
                      value={config.defeitoDays}
                      onChange={(e) => handleConfigChange('defeitoDays', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="requirePhotos">Exigir fotos para defeitos</Label>
                    <Switch
                      id="requirePhotos"
                      checked={config.requirePhotosForDefect}
                      onCheckedChange={(checked) => handleConfigChange('requirePhotosForDefect', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Auto-aprovação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="autoApproveLimit">Aprovar automaticamente até (R$)</Label>
                    <Input
                      id="autoApproveLimit"
                      type="number"
                      step="0.01"
                      value={config.autoApproveLimit}
                      onChange={(e) => handleConfigChange('autoApproveLimit', parseFloat(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Valores acima disso vão para análise manual
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="prioritizeVoucher">Priorizar vale-compra</Label>
                    <Switch
                      id="prioritizeVoucher"
                      checked={config.prioritizeVoucher}
                      onCheckedChange={(checked) => handleConfigChange('prioritizeVoucher', checked)}
                    />
                  </div>

                  {config.prioritizeVoucher && (
                    <div>
                      <Label htmlFor="voucherBonus">Bônus no vale-compra (%)</Label>
                      <Input
                        id="voucherBonus"
                        type="number"
                        value={config.voucherBonus}
                        onChange={(e) => handleConfigChange('voucherBonus', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Métodos Tab */}
          <TabsContent value="methods" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Reembolso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableCard">Cartão de Crédito (estorno)</Label>
                    <Switch
                      id="enableCard"
                      checked={config.enableCard}
                      onCheckedChange={(checked) => handleConfigChange('enableCard', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="enablePix">PIX</Label>
                    <Switch
                      id="enablePix"
                      checked={config.enablePix}
                      onCheckedChange={(checked) => handleConfigChange('enablePix', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableBoleto">Boleto Bancário</Label>
                    <Switch
                      id="enableBoleto"
                      checked={config.enableBoleto}
                      onCheckedChange={(checked) => handleConfigChange('enableBoleto', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableVoucher">Vale-compra</Label>
                    <Switch
                      id="enableVoucher"
                      checked={config.enableVoucher}
                      onCheckedChange={(checked) => handleConfigChange('enableVoucher', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Validações PIX</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pixValidation">Tipo de chave PIX aceita</Label>
                    <Select
                      value={config.pixValidation}
                      onValueChange={(value) => handleConfigChange('pixValidation', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer tipo</SelectItem>
                        <SelectItem value="cpf">Apenas CPF</SelectItem>
                        <SelectItem value="cnpj">Apenas CNPJ</SelectItem>
                        <SelectItem value="email">Apenas E-mail</SelectItem>
                        <SelectItem value="phone">Apenas Telefone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aparência Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Identidade Visual</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="storeLogo">Logo da loja (URL)</Label>
                      <Input
                        id="storeLogo"
                        value={config.storeLogo}
                        onChange={(e) => handleConfigChange('storeLogo', e.target.value)}
                        placeholder="https://exemplo.com/logo.png"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primaryColor">Cor primária</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={config.primaryColor}
                            onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={config.primaryColor}
                            onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="secondaryColor">Cor secundária</Label>
                        <div className="flex gap-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={config.secondaryColor}
                            onChange={(e) => handleConfigChange('secondaryColor', e.target.value)}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={config.secondaryColor}
                            onChange={(e) => handleConfigChange('secondaryColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Layout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="formWidth">Largura do formulário</Label>
                      <Select
                        value={config.formWidth}
                        onValueChange={(value) => handleConfigChange('formWidth', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="narrow">Estreito (600px)</SelectItem>
                          <SelectItem value="comfy">Confortável (720px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="borderRadius">Raio de borda (px)</Label>
                      <Select
                        value={config.borderRadius.toString()}
                        onValueChange={(value) => handleConfigChange('borderRadius', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8px</SelectItem>
                          <SelectItem value="12">12px</SelectItem>
                          <SelectItem value="16">16px</SelectItem>
                          <SelectItem value="24">24px</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="showSidebar">Mostrar sumário lateral</Label>
                      <Switch
                        id="showSidebar"
                        checked={config.showSidebar}
                        onCheckedChange={(checked) => handleConfigChange('showSidebar', checked)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="colorMode">Modo de cor</Label>
                      <Select
                        value={config.colorMode}
                        onValueChange={(value) => handleConfigChange('colorMode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Claro</SelectItem>
                          <SelectItem value="dark">Escuro</SelectItem>
                          <SelectItem value="auto">Automático</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Preview */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Preview ao Vivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="border rounded-lg p-6 space-y-4"
                      style={{
                        backgroundColor: config.backgroundColor,
                        color: config.textColor,
                        borderRadius: `${config.borderRadius}px`
                      }}
                    >
                      {config.storeLogo && (
                        <div className="text-center">
                          <img 
                            src={config.storeLogo} 
                            alt="Logo" 
                            className="h-12 mx-auto"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold" style={{ color: config.primaryColor }}>
                          {config.welcomeTitle}
                        </h2>
                        <p style={{ color: config.secondaryColor }}>
                          {config.welcomeSubtitle}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Número do pedido
                          </label>
                          <div 
                            className="w-full px-3 py-2 border rounded bg-white text-gray-900"
                            style={{ borderRadius: `${config.borderRadius}px` }}
                          >
                            #12345
                          </div>
                        </div>

                        <button
                          className="w-full py-3 rounded font-medium text-white"
                          style={{
                            backgroundColor: config.primaryColor,
                            borderRadius: `${config.borderRadius}px`
                          }}
                        >
                          Continuar
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Mensagens Tab */}
          <TabsContent value="messages" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Textos do Portal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="language">Idioma principal</Label>
                    <Select
                      value={config.language}
                      onValueChange={(value) => handleConfigChange('language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt">Português</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="welcomeTitle">Título principal</Label>
                    <Input
                      id="welcomeTitle"
                      value={config.welcomeTitle}
                      onChange={(e) => handleConfigChange('welcomeTitle', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="welcomeSubtitle">Subtítulo</Label>
                    <Input
                      id="welcomeSubtitle"
                      value={config.welcomeSubtitle}
                      onChange={(e) => handleConfigChange('welcomeSubtitle', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Política de Reembolso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="policy">Texto da política (pública)</Label>
                    <Textarea
                      id="policy"
                      value={config.policy}
                      onChange={(e) => handleConfigChange('policy', e.target.value)}
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Templates de E-mail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Configure os templates de e-mail enviados automaticamente em cada etapa do processo.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Solicitação Criada</h4>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando o cliente submete a solicitação
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Reembolso Aprovado</h4>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando a solicitação é aprovada
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Processamento Iniciado</h4>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando o pagamento é iniciado
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Reembolso Concluído</h4>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando o reembolso é finalizado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RefundsSetup;