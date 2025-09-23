-- Criar views e function RPC para o dashboard

-- View para resumo de pedidos por loja e período
CREATE OR REPLACE VIEW vw_store_orders_summary AS
SELECT
  o.store_id,
  date_trunc('day', o.created_at) as day,
  sum(o.total) as total_revenue,
  count(*) as order_count,
  o.currency
FROM orders o
GROUP BY o.store_id, date_trunc('day', o.created_at), o.currency;

-- View para receita de email (Klaviyo) por loja e período
CREATE OR REPLACE VIEW vw_channel_email_summary AS
SELECT
  c.store_id,
  c.period_start,
  c.period_end,
  sum(c.revenue) as email_revenue,
  c.currency
FROM channel_revenue c
WHERE c.channel = 'email'
GROUP BY c.store_id, c.period_start, c.period_end, c.currency;

-- Function RPC para buscar KPIs consolidados por período
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

-- Function para buscar série temporal de receita
CREATE OR REPLACE FUNCTION rpc_get_revenue_series(
  _store_id uuid,
  _start_date timestamptz,
  _end_date timestamptz,
  _interval text DEFAULT 'day'
)
RETURNS TABLE(
  period timestamptz,
  total_revenue numeric,
  email_revenue numeric,
  order_count bigint
)
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