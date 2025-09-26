-- Ensure unique indexes for upserts
CREATE UNIQUE INDEX IF NOT EXISTS ux_klaviyo_summaries_store_period
  ON public.klaviyo_summaries (store_id, period_start, period_end);

CREATE UNIQUE INDEX IF NOT EXISTS ux_channel_revenue_store_period_channel
  ON public.channel_revenue (store_id, period_start, period_end, channel);

-- Enable RLS and add SELECT policies so store members can read data on the dashboard
ALTER TABLE public.klaviyo_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_jobs ENABLE ROW LEVEL SECURITY;

-- Avoid duplicates if policies already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='klaviyo_summaries' AND policyname='Users can view their klaviyo_summaries'
  ) THEN
    CREATE POLICY "Users can view their klaviyo_summaries"
      ON public.klaviyo_summaries
      FOR SELECT
      USING (
        is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='channel_revenue' AND policyname='Users can view their channel_revenue'
  ) THEN
    CREATE POLICY "Users can view their channel_revenue"
      ON public.channel_revenue
      FOR SELECT
      USING (
        is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='n8n_jobs' AND policyname='Users can view their store jobs'
  ) THEN
    CREATE POLICY "Users can view their store jobs"
      ON public.n8n_jobs
      FOR SELECT
      USING (
        is_admin(auth.uid())
        OR created_by = auth.uid()
        OR public.user_has_store_access(auth.uid(), store_id)
      );
  END IF;
END $$;

-- Update guard clauses in RPCs to rely on user_has_store_access()
CREATE OR REPLACE FUNCTION public.rpc_get_revenue_series(
  _store_id uuid,
  _start_date timestamp with time zone,
  _end_date timestamp with time zone,
  _interval text DEFAULT 'day'
)
RETURNS TABLE(period timestamp with time zone, total_revenue numeric, email_revenue numeric, order_count bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Strong access check via helper
  IF NOT public.user_has_store_access(auth.uid(), _store_id) THEN
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
BEGIN
  -- Strong access check via helper
  IF NOT public.user_has_store_access(auth.uid(), _store_id) THEN
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