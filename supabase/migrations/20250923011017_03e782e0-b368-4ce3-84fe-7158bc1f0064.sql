-- 0) Correção de bugs atuais - função is_admin para evitar 406 errors
CREATE OR REPLACE FUNCTION is_admin(p_uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM users u 
    WHERE u.id = p_uid AND (u.is_admin IS TRUE OR u.role IN ('admin','super_admin'))
  );
$$;

-- 1) Schema para pedidos Shopify (adicionar campos essenciais se não existem)
DO $$ 
BEGIN
  -- Adicionar campos para recorrência se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id_ext') THEN
    ALTER TABLE orders ADD COLUMN customer_id_ext bigint;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_email') THEN
    ALTER TABLE orders ADD COLUMN customer_email text;
  END IF;
END $$;

-- Índices úteis para performance
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_ext ON orders(store_id, customer_id_ext);

-- 3) KPI Faturamento Total por período
CREATE OR REPLACE FUNCTION kpi_total_revenue(p_store uuid, p_start timestamptz, p_end timestamptz)
RETURNS numeric 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT COALESCE(SUM(o.total), 0)
  FROM orders o
  WHERE o.store_id = p_store
    AND o.created_at >= p_start
    AND o.created_at < p_end;
$$;

-- 4) Taxa de Clientes Recorrentes - clientes únicos do período
CREATE OR REPLACE FUNCTION kpi_customers_distinct(p_store uuid, p_start timestamptz, p_end timestamptz)
RETURNS integer 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT o.customer_id_ext)::integer
  FROM orders o
  WHERE o.store_id = p_store
    AND o.created_at >= p_start
    AND o.created_at < p_end
    AND o.customer_id_ext IS NOT NULL;
$$;

-- 4) Taxa de Clientes Recorrentes - quantos já tinham pedido antes (recorrentes)
CREATE OR REPLACE FUNCTION kpi_customers_returning(p_store uuid, p_start timestamptz, p_end timestamptz)
RETURNS integer 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

-- Preparação Klaviyo (etapa 2) - adicionar campo se não existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel_revenue' AND column_name = 'orders_count') THEN
    ALTER TABLE channel_revenue ADD COLUMN orders_count integer DEFAULT 0;
  END IF;
END $$;

-- Funções preparadas para Klaviyo (etapa 2)
CREATE OR REPLACE FUNCTION kpi_email_revenue(p_store uuid, p_start timestamptz, p_end timestamptz)
RETURNS numeric 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cr.revenue), 0)
  FROM channel_revenue cr
  WHERE cr.store_id = p_store
    AND cr.channel = 'email'
    AND cr.period_start::timestamptz >= p_start::date
    AND cr.period_end::timestamptz < p_end::date;
$$;

CREATE OR REPLACE FUNCTION kpi_email_orders_count(p_store uuid, p_start timestamptz, p_end timestamptz)
RETURNS integer 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cr.orders_count), 0)::integer
  FROM channel_revenue cr
  WHERE cr.store_id = p_store
    AND cr.channel = 'email'
    AND cr.period_start::timestamptz >= p_start::date
    AND cr.period_end::timestamptz < p_end::date;
$$;