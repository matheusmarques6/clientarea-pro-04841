-- Fix security definer functions that don't need elevated privileges
-- Convert KPI functions to use proper RLS instead of SECURITY DEFINER

-- First, let's check which functions are currently SECURITY DEFINER
-- The following functions should remain SECURITY DEFINER as they need elevated privileges:
-- - is_admin (needs to check admin status)
-- - admin-related functions
-- - trigger functions that need to bypass RLS

-- Convert KPI functions to SECURITY INVOKER and let RLS handle access control
CREATE OR REPLACE FUNCTION public.kpi_customers_distinct(p_store uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT o.customer_id_ext)::integer
  FROM orders o
  WHERE o.store_id = p_store
    AND o.created_at >= p_start
    AND o.created_at < p_end
    AND o.customer_id_ext IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.kpi_customers_returning(p_store uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  WITH period_customers AS (
    SELECT DISTINCT o.customer_id_ext
    FROM orders o
    WHERE o.store_id = p_store
      AND o.created_at >= p_start
      AND o.created_at < p_end
      AND o.customer_id_ext IS NOT NULL
  )
  SELECT COUNT(*)::integer
  FROM period_customers pc
  WHERE EXISTS (
    SELECT 1
    FROM orders x
    WHERE x.store_id = p_store
      AND x.customer_id_ext = pc.customer_id_ext
      AND x.created_at < p_start
  );
$function$;

CREATE OR REPLACE FUNCTION public.kpi_total_revenue(p_store uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(o.total), 0)
  FROM orders o
  WHERE o.store_id = p_store
    AND o.created_at >= p_start
    AND o.created_at < p_end;
$function$;

CREATE OR REPLACE FUNCTION public.kpi_email_revenue(p_store uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(cr.revenue), 0)
  FROM channel_revenue cr
  WHERE cr.store_id = p_store
    AND cr.channel = 'email'
    AND cr.period_start::timestamptz >= p_start::date
    AND cr.period_end::timestamptz < p_end::date;
$function$;

CREATE OR REPLACE FUNCTION public.kpi_email_orders_count(p_store uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(cr.orders_count), 0)::integer
  FROM channel_revenue cr
  WHERE cr.store_id = p_store
    AND cr.channel = 'email'
    AND cr.period_start::timestamptz >= p_start::date
    AND cr.period_end::timestamptz < p_end::date;
$function$;

-- The RPC functions that aggregate data should also be SECURITY INVOKER
-- since they already check user access via RLS policies
CREATE OR REPLACE FUNCTION public.rpc_get_store_kpis(_store_id uuid, _start_date timestamp with time zone, _end_date timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  total_revenue numeric := 0;
  email_revenue numeric := 0;
  sms_revenue numeric := 0;
  whatsapp_revenue numeric := 0;
  order_count integer := 0;
  order_currency text := 'BRL';
BEGIN
  -- Verificar se o usuário tem acesso à loja (this will be enforced by RLS)
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
$function$;

CREATE OR REPLACE FUNCTION public.rpc_get_revenue_series(_store_id uuid, _start_date timestamp with time zone, _end_date timestamp with time zone, _interval text DEFAULT 'day'::text)
 RETURNS TABLE(period timestamp with time zone, total_revenue numeric, email_revenue numeric, order_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se o usuário tem acesso à loja (this will be enforced by RLS)
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
$function$;