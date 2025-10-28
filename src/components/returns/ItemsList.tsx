import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface RefundItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

interface ItemsListProps {
  items: RefundItem[];
  onChange: (items: RefundItem[]) => void;
  onTotalChange: (total: number) => void;
}

export const ItemsList = ({ items, onChange, onTotalChange }: ItemsListProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<RefundItem, 'id'>>({
    name: '',
    sku: '',
    quantity: 1,
    price: 0,
  });

  const calculateTotal = (itemsList: RefundItem[]) => {
    return itemsList.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const handleAddItem = () => {
    if (!newItem.name.trim() || !newItem.sku.trim() || newItem.price <= 0) {
      return;
    }

    const itemToAdd: RefundItem = {
      id: Math.random().toString(36).slice(2),
      ...newItem,
    };

    const updatedItems = [...items, itemToAdd];
    onChange(updatedItems);
    onTotalChange(calculateTotal(updatedItems));

    // Reset form
    setNewItem({
      name: '',
      sku: '',
      quantity: 1,
      price: 0,
    });
    setIsAdding(false);
  };

  const handleRemoveItem = (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id);
    onChange(updatedItems);
    onTotalChange(calculateTotal(updatedItems));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Items do Pedido</Label>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </Badge>
          )}
        </div>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Adicionar Item
          </Button>
        )}
      </div>

      {/* Lista de items existentes */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.sku} • Qtd: {item.quantity}x {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(item.quantity * item.price)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <span className="text-sm font-semibold text-foreground">Total dos Items</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(calculateTotal(items))}
            </span>
          </div>
        </div>
      )}

      {/* Formulário para adicionar novo item */}
      {isAdding && (
        <Card className="border-2 border-dashed border-purple-300 dark:border-purple-700">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="item-name" className="text-xs">
                  Nome do Produto *
                </Label>
                <Input
                  id="item-name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Ex: Camiseta Premium"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="item-sku" className="text-xs">
                  SKU/Código *
                </Label>
                <Input
                  id="item-sku"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                  placeholder="Ex: CAM-001"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="item-quantity" className="text-xs">
                  Quantidade *
                </Label>
                <Input
                  id="item-quantity"
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="item-price" className="text-xs">
                  Valor Unitário (R$) *
                </Label>
                <Input
                  id="item-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewItem({ name: '', sku: '', quantity: 1, price: 0 });
                }}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleAddItem}>
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && !isAdding && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em "Adicionar Item" para começar
          </p>
        </div>
      )}
    </div>
  );
};
