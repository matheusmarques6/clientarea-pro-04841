-- Criar tabelas para dados sincronizados do Shopify e Klaviyo

-- Atualizar tabela orders existente para incluir dados do Shopify
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_id bigint;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS raw jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text;

-- Criar constraint única para shopify_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_shopify_id_unique') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_shopify_id_unique UNIQUE (shopify_id);
    END IF;
END $$;

-- Receita por canal (Klaviyo agregado por período)
CREATE TABLE IF NOT EXISTS channel_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  channel text NOT NULL,   -- 'email'|'sms'|'whatsapp'
  source text NOT NULL,    -- 'campaign'|'flow'|'aggregate'
  period_start date NOT NULL,
  period_end date NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'BRL',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cache de KPIs para performance
CREATE TABLE IF NOT EXISTS dashboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_order_revenue numeric NOT NULL DEFAULT 0,
  email_revenue numeric NOT NULL DEFAULT 0,
  sms_revenue numeric NOT NULL DEFAULT 0,
  whatsapp_revenue numeric NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, period_start, period_end)
);

-- Logs de sincronização
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  provider text NOT NULL, -- 'shopify'|'klaviyo'
  sync_type text NOT NULL, -- 'orders'|'revenue'
  status text NOT NULL, -- 'success'|'error'|'partial'
  message text,
  records_processed integer DEFAULT 0,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para channel_revenue
ALTER TABLE channel_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_revenue_rw_policy" 
ON channel_revenue 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM v_user_stores 
  WHERE user_id = auth.uid() AND store_id = channel_revenue.store_id
));

-- RLS para dashboard_cache
ALTER TABLE dashboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_cache_rw_policy" 
ON dashboard_cache 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM v_user_stores 
  WHERE user_id = auth.uid() AND store_id = dashboard_cache.store_id
));

-- RLS para sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_logs_rw_policy" 
ON sync_logs 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM v_user_stores 
  WHERE user_id = auth.uid() AND store_id = sync_logs.store_id
));

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na channel_revenue se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_channel_revenue_updated_at') THEN
        CREATE TRIGGER update_channel_revenue_updated_at
        BEFORE UPDATE ON channel_revenue
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;