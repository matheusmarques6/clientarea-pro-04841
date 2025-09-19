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

const ReturnsSetup = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();
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
  
  const store = mockStores.find(s => s.id === storeId);
  
  if (!store) {
    return <div>Loja não encontrada</div>;
  }

  const publicUrl = `https://${store.name.toLowerCase().replace(/\s+/g, '-')}.convertfy.com/returns`;

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
            <Link to={`/store/${storeId}/returns`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configurar Link Público</h1>
            <p className="text-muted-foreground">Trocas & Devoluções • {store.name}</p>
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

          {/* Eligibility Rules */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Regras de Elegibilidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="janela">Janela de devolução (dias)</Label>
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
                <Label htmlFor="valorMinimo">Valor mínimo do pedido (R$)</Label>
                <Input
                  type="number"
                  value={config.valorMinimo}
                  onChange={(e) => setConfig({...config, valorMinimo: parseFloat(e.target.value)})}
                  placeholder="50.00"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="exigirFotos">Exigir fotos dos produtos</Label>
                <Switch
                  checked={config.exigirFotos}
                  onCheckedChange={(checked) => setConfig({...config, exigirFotos: checked})}
                />
              </div>

              <div>
                <Label>Categorias bloqueadas</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Produtos destas categorias não poderão ser devolvidos
                </p>
                <Input placeholder="Digite categorias separadas por vírgula" />
              </div>
            </CardContent>
          </Card>

          {/* Automation */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Automação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="aprovarAuto">Aprovação automática</Label>
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
                <Label>Logística reversa</Label>
                <Select value={config.logisticaReversa} onValueChange={(value) => setConfig({...config, logisticaReversa: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="etiqueta">Gerar etiqueta (mock)</SelectItem>
                    <SelectItem value="manual">Instruções manuais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Mensagens Públicas</CardTitle>
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
                    <Label>Mensagem de confirmação</Label>
                    <Textarea
                      value={config.mensagemPt}
                      onChange={(e) => setConfig({...config, mensagemPt: e.target.value})}
                      placeholder="Mensagem exibida após a solicitação"
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="en" className="space-y-4">
                  <div>
                    <Label>Confirmation message</Label>
                    <Textarea
                      value={config.mensagemEn}
                      onChange={(e) => setConfig({...config, mensagemEn: e.target.value})}
                      placeholder="Message displayed after request"
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="es" className="space-y-4">
                  <div>
                    <Label>Mensaje de confirmación</Label>
                    <Textarea
                      value={config.mensagemEs}
                      onChange={(e) => setConfig({...config, mensagemEs: e.target.value})}
                      placeholder="Mensaje mostrado después de la solicitud"
                      rows={4}
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

export default ReturnsSetup;