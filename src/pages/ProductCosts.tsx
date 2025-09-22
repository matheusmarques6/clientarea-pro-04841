import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RefreshCw, Upload, Download, DollarSign, TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStores';
import { useProductCosts } from '@/hooks/useProductCosts';
import { useProducts } from '@/hooks/useSupabaseData';

const ProductCosts = () => {
  const { id: storeId } = useParams();
  const { toast } = useToast();
  const { store, isLoading } = useStore(storeId!);
  const { data: productCosts, loading: costsLoading, saveBulkCosts } = useProductCosts(storeId!);
  const { data: products, loading: productsLoading } = useProducts(storeId);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCosts, setEditingCosts] = useState<{ [key: string]: any }>({});
  
  const mockFxRates = {
    USD_BRL: 5.20,
    EUR_BRL: 5.60,
    GBP_BRL: 6.40
  };
  
  if (isLoading || costsLoading || productsLoading) {
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

  const handleSyncShopify = () => {
    toast({
      title: "Sincronização iniciada",
      description: "Produtos sendo sincronizados com Shopify...",
    });
  };

  const handleCostChange = (sku: string, currency: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingCosts(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        [currency]: numValue
      }
    }));
  };

  const handleSaveCosts = async () => {
    await saveBulkCosts(editingCosts);
    setEditingCosts({});
  };

  const getCostForSku = (sku: string, currency: string) => {
    if (editingCosts[sku]?.[currency] !== undefined) {
      return editingCosts[sku][currency];
    }
    
    const costData = productCosts.find(cost => cost.sku === sku);
    if (!costData) return '';
    
    switch (currency) {
      case 'BRL': return costData.cost_brl || '';
      case 'USD': return costData.cost_usd || '';
      case 'EUR': return costData.cost_eur || '';
      case 'GBP': return costData.cost_gbp || '';
      default: return '';
    }
  };

  const allVariants = products.flatMap(product => 
    product.variants?.map(variant => ({
      ...variant,
      productTitle: product.title,
      productImage: product.image_url
    })) || []
  );

  const filteredVariants = allVariants.filter(variant => 
    variant.productTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variant.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variant.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custo de Produto</h1>
          <p className="text-muted-foreground">{store.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSyncShopify}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar Shopify
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total de Produtos</span>
            </div>
            <p className="text-2xl font-bold">{allVariants.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Com Custos</span>
            </div>
            <p className="text-2xl font-bold">{productCosts.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Taxa USD/BRL</span>
            </div>
            <p className="text-lg font-bold">R$ {mockFxRates.USD_BRL}</p>
            <Badge variant="secondary" className="text-xs">Mock</Badge>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Taxa EUR/BRL</span>
            </div>
            <p className="text-lg font-bold">R$ {mockFxRates.EUR_BRL}</p>
            <Badge variant="secondary" className="text-xs">Mock</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Buscar por produto, SKU ou variante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Definir custo = 50% do preço
          </Button>
          <Button onClick={handleSaveCosts} disabled={Object.keys(editingCosts).length === 0}>
            Salvar Tudo
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Produtos e Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Produto</th>
                  <th className="text-left p-2">Variante/SKU</th>
                  <th className="text-right p-2">Preço ({store.currency})</th>
                  <th className="text-right p-2">Custo BRL</th>
                  <th className="text-right p-2">Custo USD</th>
                  <th className="text-right p-2">Custo EUR</th>
                  <th className="text-right p-2">Custo GBP</th>
                  <th className="text-left p-2">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {filteredVariants.map((variant) => {
                  const costData = productCosts.find(cost => cost.sku === variant.sku);
                  return (
                    <tr key={variant.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            📦
                          </div>
                          <span className="font-medium">{variant.productTitle}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{variant.title}</p>
                          <p className="text-sm text-muted-foreground">{variant.sku}</p>
                        </div>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {store.currency === 'BRL' && 'R$ '}
                        {store.currency === 'USD' && '$ '}
                        {store.currency === 'EUR' && '€ '}
                        {store.currency === 'GBP' && '£ '}
                        {variant.price?.toFixed(2)}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={getCostForSku(variant.sku, 'BRL')}
                          onChange={(e) => handleCostChange(variant.sku, 'BRL', e.target.value)}
                          className="w-20 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={getCostForSku(variant.sku, 'USD')}
                          onChange={(e) => handleCostChange(variant.sku, 'USD', e.target.value)}
                          className="w-20 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={getCostForSku(variant.sku, 'EUR')}
                          onChange={(e) => handleCostChange(variant.sku, 'EUR', e.target.value)}
                          className="w-20 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={getCostForSku(variant.sku, 'GBP')}
                          onChange={(e) => handleCostChange(variant.sku, 'GBP', e.target.value)}
                          className="w-20 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2">
                        {costData && (
                          <div className="text-sm">
                            <p>{new Date(costData.updated_at).toLocaleDateString('pt-BR')}</p>
                            <p className="text-muted-foreground">{costData.updated_by || 'Sistema'}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductCosts;