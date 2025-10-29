import { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar se é um arquivo CSV
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo CSV não contém dados.",
          variant: "destructive",
        });
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const skuIndex = headers.indexOf('sku');
      const costBrlIndex = headers.indexOf('cost_brl') !== -1 ? headers.indexOf('cost_brl') : headers.indexOf('custo_brl');
      const costUsdIndex = headers.indexOf('cost_usd') !== -1 ? headers.indexOf('cost_usd') : headers.indexOf('custo_usd');
      const costEurIndex = headers.indexOf('cost_eur') !== -1 ? headers.indexOf('cost_eur') : headers.indexOf('custo_eur');
      const costGbpIndex = headers.indexOf('cost_gbp') !== -1 ? headers.indexOf('cost_gbp') : headers.indexOf('custo_gbp');

      if (skuIndex === -1) {
        toast({
          title: "Formato inválido",
          description: "O arquivo CSV deve ter uma coluna 'SKU'.",
          variant: "destructive",
        });
        return;
      }

      // Parse data rows
      const importedCosts: { [key: string]: any } = {};
      let validRows = 0;
      let skippedRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const sku = values[skuIndex];

        if (!sku) {
          skippedRows++;
          continue;
        }

        importedCosts[sku] = {};

        if (costBrlIndex !== -1 && values[costBrlIndex]) {
          const value = parseFloat(values[costBrlIndex]);
          if (!isNaN(value)) importedCosts[sku].BRL = value;
        }

        if (costUsdIndex !== -1 && values[costUsdIndex]) {
          const value = parseFloat(values[costUsdIndex]);
          if (!isNaN(value)) importedCosts[sku].USD = value;
        }

        if (costEurIndex !== -1 && values[costEurIndex]) {
          const value = parseFloat(values[costEurIndex]);
          if (!isNaN(value)) importedCosts[sku].EUR = value;
        }

        if (costGbpIndex !== -1 && values[costGbpIndex]) {
          const value = parseFloat(values[costGbpIndex]);
          if (!isNaN(value)) importedCosts[sku].GBP = value;
        }

        if (Object.keys(importedCosts[sku]).length > 0) {
          validRows++;
        } else {
          delete importedCosts[sku];
        }
      }

      if (validRows === 0) {
        toast({
          title: "Nenhum dado válido",
          description: "O arquivo não contém custos válidos para importar.",
          variant: "destructive",
        });
        return;
      }

      // Merge with existing editing costs
      setEditingCosts(prev => ({
        ...prev,
        ...importedCosts
      }));

      toast({
        title: "Importação concluída",
        description: `${validRows} produto(s) importado(s) com sucesso.${skippedRows > 0 ? ` ${skippedRows} linha(s) ignorada(s).` : ''}`,
      });

    } catch (error) {
      console.error('Erro ao importar CSV:', error);
      toast({
        title: "Erro ao importar",
        description: "Ocorreu um erro ao processar o arquivo CSV.",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportClick = () => {
    try {
      // Create CSV content
      const headers = ['SKU', 'Produto', 'Variante', 'Preço (USD)', 'Cost_BRL', 'Cost_USD', 'Cost_EUR', 'Cost_GBP'];
      const rows = allVariants.map(variant => {
        const costData = productCosts.find(cost => cost.sku === variant.sku);
        return [
          variant.sku || '',
          variant.productTitle || '',
          variant.title || '',
          variant.price?.toFixed(2) || '',
          costData?.cost_brl?.toFixed(2) || '',
          costData?.cost_usd?.toFixed(2) || '',
          costData?.cost_eur?.toFixed(2) || '',
          costData?.cost_gbp?.toFixed(2) || ''
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `custos_produtos_${store.name}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `${allVariants.length} produto(s) exportado(s) com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o arquivo CSV.",
        variant: "destructive",
      });
    }
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="outline" onClick={handleImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button variant="outline" onClick={handleExportClick}>
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