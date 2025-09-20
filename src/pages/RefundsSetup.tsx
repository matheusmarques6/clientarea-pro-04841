import { useState } from 'react';
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
import { mockStores } from '@/lib/mockData';
import { supportedLanguages } from '@/lib/translations';

const RefundsSetup = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();
  const [config, setConfig] = useState({
    janelaDias: 7,
    autoAprovarAte: 100,
    exigirFotos: true,
    pedidoEntregue: true,
    politicaPt: 'Reembolsos serão processados em até 5 dias úteis após a aprovação.',
    politicaEn: 'Refunds will be processed within 5 business days after approval.',
    politicaEs: 'Los reembolsos se procesarán dentro de 5 días hábiles después de la aprobación.'
  });
  
  const store = mockStores.find(s => s.id === storeId);
  const [refundsLanguage, setRefundsLanguage] = useState(store?.refundsLanguage || 'pt');
  
  if (!store) {
    return <div>Loja não encontrada</div>;
  }

  const publicUrl = `https://${store.name.toLowerCase().replace(/\s+/g, '-')}.convertfy.com/refunds`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "URL copiada!",
      description: "URL do link público copiada para a área de transferência",
    });
  };

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Configurações do link público atualizadas com sucesso",
    });
  };

  const handlePreview = () => {
    toast({
      title: "Preview",
      description: "Abrindo preview do portal público...",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/store/${storeId}/refunds`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configurar Link Público</h1>
            <p className="text-muted-foreground">Reembolsos • {store.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-6">
          {/* URL */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>URL do Portal Público</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input value={publicUrl} readOnly className="flex-1" />
                <Button size="sm" onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant="secondary">
                URL gerada automaticamente baseada no nome da loja
              </Badge>
            </CardContent>
          </Card>

          {/* Language Configuration */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Idioma do Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="refundsLanguage">Idioma para Reembolsos</Label>
                <Select value={refundsLanguage} onValueChange={setRefundsLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Define o idioma que será exibido no formulário público de reembolsos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Criteria */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Critérios de Reembolso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pedidoEntregue">Pedido deve estar entregue</Label>
                  <p className="text-sm text-muted-foreground">
                    Só permite reembolso após confirmação de entrega
                  </p>
                </div>
                <Switch
                  checked={config.pedidoEntregue}
                  onCheckedChange={(checked) => setConfig({...config, pedidoEntregue: checked})}
                />
              </div>

              <div>
                <Label htmlFor="janela">Janela para solicitação (dias)</Label>
                <Select value={config.janelaDias.toString()} onValueChange={(value) => setConfig({...config, janelaDias: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="autoAprovar">Auto-aprovar até (R$)</Label>
                <Input
                  type="number"
                  value={config.autoAprovarAte}
                  onChange={(e) => setConfig({...config, autoAprovarAte: parseFloat(e.target.value)})}
                  placeholder="100.00"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Valores até este limite serão aprovados automaticamente
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="exigirFotos">Exigir fotos para reembolso</Label>
                  <p className="text-sm text-muted-foreground">
                    Cliente deve anexar fotos dos produtos
                  </p>
                </div>
                <Switch
                  checked={config.exigirFotos}
                  onCheckedChange={(checked) => setConfig({...config, exigirFotos: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Policies */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Política Pública</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pt" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pt">Português</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="es">Español</TabsTrigger>
                </TabsList>

                <TabsContent value="pt" className="space-y-4">
                  <div>
                    <Label>Política de reembolso</Label>
                    <Textarea
                      value={config.politicaPt}
                      onChange={(e) => setConfig({...config, politicaPt: e.target.value})}
                      placeholder="Descreva sua política de reembolso..."
                      rows={6}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="en" className="space-y-4">
                  <div>
                    <Label>Refund policy</Label>
                    <Textarea
                      value={config.politicaEn}
                      onChange={(e) => setConfig({...config, politicaEn: e.target.value})}
                      placeholder="Describe your refund policy..."
                      rows={6}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="es" className="space-y-4">
                  <div>
                    <Label>Política de reembolso</Label>
                    <Textarea
                      value={config.politicaEs}
                      onChange={(e) => setConfig({...config, politicaEs: e.target.value})}
                      placeholder="Describe tu política de reembolso..."
                      rows={6}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Preview do Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-4/5"></div>
                  <div className="h-3 bg-muted rounded w-3/5"></div>
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
  );
};

export default RefundsSetup;