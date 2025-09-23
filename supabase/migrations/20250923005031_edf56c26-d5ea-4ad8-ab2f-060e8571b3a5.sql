-- Migração ajustada evitando conflitos

-- Verificar e dropar políticas existentes se necessário
DROP POLICY IF EXISTS "channel_revenue_rw_policy" ON channel_revenue;
DROP POLICY IF EXISTS "dashboard_cache_rw_policy" ON dashboard_cache;

-- Recriar políticas
CREATE POLICY "channel_revenue_rw_policy" ON channel_revenue
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = channel_revenue.store_id
  )
);

CREATE POLICY "dashboard_cache_rw_policy" ON dashboard_cache
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = dashboard_cache.store_id
  )
);

-- Adicionar triggers para updated_at
CREATE OR REPLACE TRIGGER update_channel_revenue_updated_at
  BEFORE UPDATE ON channel_revenue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_id) WHERE shopify_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_revenue_store_period ON channel_revenue(store_id, channel, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_store_period ON dashboard_cache(store_id, period_start, period_end);