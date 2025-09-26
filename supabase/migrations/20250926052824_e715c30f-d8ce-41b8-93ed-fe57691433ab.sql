-- Corrigir a função rpc_get_store_kpis para usar a moeda da loja
CREATE OR REPLACE FUNCTION public.rpc_get_store_kpis(
  _store_id uuid,
  _start_date timestamp with time zone,
  _end_date timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := '{}';
  total_revenue numeric := 0;
  email_revenue numeric := 0;
  sms_revenue numeric := 0;
  whatsapp_revenue numeric := 0;
  order_count integer := 0;
  order_currency text := 'BRL';
  store_currency text := 'BRL';
BEGIN
  -- Strong access check via helper
  IF NOT public.user_has_store_access(auth.uid(), _store_id) THEN
    RAISE EXCEPTION 'Acesso negado à loja especificada';
  END IF;

  -- Buscar a moeda configurada da loja
  SELECT COALESCE(s.currency, 'BRL')
  INTO store_currency
  FROM stores s
  WHERE s.id = _store_id;

  -- Total de pedidos no período
  SELECT 
    COALESCE(SUM(o.total), 0),
    COUNT(*)
  INTO total_revenue, order_count
  FROM orders o
  WHERE o.store_id = _store_id 
    AND o.created_at BETWEEN _start_date AND _end_date;

  -- Receita de email no período
  SELECT COALESCE(SUM(c.revenue), 0)
  INTO email_revenue
  FROM channel_revenue c
  WHERE c.store_id = _store_id 
    AND c.channel = 'email'
    AND c.period_start >= _start_date::date 
    AND c.period_end <= _end_date::date;

  -- Receita de SMS no período
  SELECT COALESCE(SUM(c.revenue), 0)
  INTO sms_revenue
  FROM channel_revenue c
  WHERE c.store_id = _store_id 
    AND c.channel = 'sms'
    AND c.period_start >= _start_date::date 
    AND c.period_end <= _end_date::date;

  -- Receita de WhatsApp no período
  SELECT COALESCE(SUM(c.revenue), 0)
  INTO whatsapp_revenue
  FROM channel_revenue c
  WHERE c.store_id = _store_id 
    AND c.channel = 'whatsapp'
    AND c.period_start >= _start_date::date 
    AND c.period_end <= _end_date::date;

  -- Montar resultado com a moeda da loja
  result := jsonb_build_object(
    'total_revenue', total_revenue,
    'email_revenue', email_revenue,
    'sms_revenue', sms_revenue,
    'whatsapp_revenue', whatsapp_revenue,
    'order_count', order_count,
    'currency', store_currency,  -- Usar a moeda da loja
    'convertfy_revenue', email_revenue + sms_revenue + whatsapp_revenue,
    'period_start', _start_date,
    'period_end', _end_date
  );

  RETURN result;
END;
$$;