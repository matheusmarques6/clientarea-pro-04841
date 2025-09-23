-- Criar tabelas para dados reais do dashboard mantendo o design atual

-- 1) Tabela de pedidos Shopify (se não existir, complementar)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_id bigint UNIQUE,
ADD COLUMN IF NOT EXISTS channel_attrib channel_attribution DEFAULT 'none',
ADD COLUMN IF NOT EXISTS raw jsonb;

-- 2) Tabela de receita por canal (Klaviyo)
CREATE TABLE IF NOT EXISTS channel_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  channel text NOT NULL,
  source text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'BRL',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Cache de dashboard para performance
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

-- RLS policies para as novas tabelas
ALTER TABLE channel_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_cache ENABLE ROW LEVEL SECURITY;

-- Políticas para channel_revenue
CREATE POLICY "channel_revenue_rw_policy" ON channel_revenue
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = channel_revenue.store_id
  )
);

-- Políticas para dashboard_cache
CREATE POLICY "dashboard_cache_rw_policy" ON dashboard_cache
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = dashboard_cache.store_id
  )
);

-- Views para consultas do dashboard
CREATE OR REPLACE VIEW vw_store_orders_summary AS
SELECT 
  store_id,
  date_trunc('day', created_at) as day,
  SUM(total) as total_revenue,
  COUNT(*) as order_count,
  MAX(currency) as currency
FROM orders 
GROUP BY store_id, date_trunc('day', created_at);

CREATE OR REPLACE VIEW vw_channel_email_summary AS
SELECT 
  store_id,
  SUM(revenue) as email_revenue,
  MIN(period_start) as period_start,
  MAX(period_end) as period_end,
  MAX(currency) as currency
FROM channel_revenue 
WHERE channel = 'email'
GROUP BY store_id;

-- Função RPC para KPIs do período
CREATE OR REPLACE FUNCTION rpc_get_store_kpis(
  _store_id uuid,
  _start_date timestamptz,
  _end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}';
  total_revenue numeric := 0;
  email_revenue numeric := 0;
  sms_revenue numeric := 0;
  whatsapp_revenue numeric := 0;
  order_count integer := 0;
  currency text := 'BRL';
BEGIN
  -- Verificar se o usuário tem acesso à loja
  IF NOT EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado à loja especificada';
  END IF;

  -- Total de pedidos no período
  SELECT 
    COALESCE(SUM(total), 0),
    COUNT(*),
    COALESCE(MAX(currency), 'BRL')
  INTO total_revenue, order_count, currency
  FROM orders 
  WHERE store_id = _store_id 
    AND created_at BETWEEN _start_date AND _end_date;

  -- Receita de email no período
  SELECT COALESCE(SUM(revenue), 0)
  INTO email_revenue
  FROM channel_revenue 
  WHERE store_id = _store_id 
    AND channel = 'email'
    AND period_start >= _start_date::date 
    AND period_end <= _end_date::date;

  -- Receita de SMS no período
  SELECT COALESCE(SUM(revenue), 0)
  INTO sms_revenue
  FROM channel_revenue 
  WHERE store_id = _store_id 
    AND channel = 'sms'
    AND period_start >= _start_date::date 
    AND period_end <= _end_date::date;

  -- Receita de WhatsApp no período
  SELECT COALESCE(SUM(revenue), 0)
  INTO whatsapp_revenue
  FROM channel_revenue 
  WHERE store_id = _store_id 
    AND channel = 'whatsapp'
    AND period_start >= _start_date::date 
    AND period_end <= _end_date::date;

  -- Montar resultado
  result := jsonb_build_object(
    'total_revenue', total_revenue,
    'email_revenue', email_revenue,
    'sms_revenue', sms_revenue,
    'whatsapp_revenue', whatsapp_revenue,
    'order_count', order_count,
    'currency', currency,
    'convertfy_revenue', email_revenue + sms_revenue + whatsapp_revenue,
    'period_start', _start_date,
    'period_end', _end_date
  );

  RETURN result;
END;
$$;

-- Função para série temporal de receita
CREATE OR REPLACE FUNCTION rpc_get_revenue_series(
  _store_id uuid,
  _start_date timestamptz,
  _end_date timestamptz,
  _interval text DEFAULT 'day'
)
RETURNS TABLE(period timestamptz, total_revenue numeric, email_revenue numeric, order_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário tem acesso à loja
  IF NOT EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado à loja especificada';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      date_trunc(_interval, _start_date),
      date_trunc(_interval, _end_date),
      ('1 ' || _interval)::interval
    ) as period
  ),
  orders_data AS (
    SELECT 
      date_trunc(_interval, o.created_at) as period,
      SUM(o.total) as revenue,
      COUNT(*) as count
    FROM orders o
    WHERE o.store_id = _store_id
      AND o.created_at BETWEEN _start_date AND _end_date
    GROUP BY date_trunc(_interval, o.created_at)
  ),
  email_data AS (
    SELECT 
      date_trunc(_interval, c.period_start::timestamptz) as period,
      SUM(c.revenue) as revenue
    FROM channel_revenue c
    WHERE c.store_id = _store_id
      AND c.channel = 'email'
      AND c.period_start >= _start_date::date
      AND c.period_end <= _end_date::date
    GROUP BY date_trunc(_interval, c.period_start::timestamptz)
  )
  SELECT 
    ds.period,
    COALESCE(od.revenue, 0) as total_revenue,
    COALESCE(ed.revenue, 0) as email_revenue,
    COALESCE(od.count, 0) as order_count
  FROM date_series ds
  LEFT JOIN orders_data od ON ds.period = od.period
  LEFT JOIN email_data ed ON ds.period = ed.period
  ORDER BY ds.period;
END;
$$;