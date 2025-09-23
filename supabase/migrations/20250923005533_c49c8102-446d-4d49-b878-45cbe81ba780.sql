-- Corrigir erro de ambiguidade na função rpc_get_store_kpis
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
  order_currency text := 'BRL';
BEGIN
  -- Verificar se o usuário tem acesso à loja
  IF NOT EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado à loja especificada';
  END IF;

  -- Total de pedidos no período (especificar tabela para currency)
  SELECT 
    COALESCE(SUM(o.total), 0),
    COUNT(*),
    COALESCE(MAX(o.currency), 'BRL')
  INTO total_revenue, order_count, order_currency
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

  -- Montar resultado
  result := jsonb_build_object(
    'total_revenue', total_revenue,
    'email_revenue', email_revenue,
    'sms_revenue', sms_revenue,
    'whatsapp_revenue', whatsapp_revenue,
    'order_count', order_count,
    'currency', order_currency,
    'convertfy_revenue', email_revenue + sms_revenue + whatsapp_revenue,
    'period_start', _start_date,
    'period_end', _end_date
  );

  RETURN result;
END;
$$;