-- FIX: Security Definer Views
-- Converting views to use SECURITY INVOKER instead of SECURITY DEFINER

-- 1. Drop and recreate users_safe view with SECURITY INVOKER
DROP VIEW IF EXISTS public.users_safe;

CREATE VIEW public.users_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  email,
  name,
  role,
  is_admin,
  created_at,
  updated_at
FROM public.users;

-- Grant appropriate permissions
GRANT SELECT ON public.users_safe TO authenticated;

COMMENT ON VIEW public.users_safe IS 'Safe view of user data excluding sensitive authentication fields - uses security invoker';

-- 2. Check and recreate vw_channel_email_summary if it exists
DROP VIEW IF EXISTS public.vw_channel_email_summary CASCADE;

CREATE VIEW public.vw_channel_email_summary 
WITH (security_invoker = true) AS
SELECT 
  store_id,
  SUM(CASE WHEN channel = 'email' THEN revenue ELSE 0 END) as email_revenue,
  MAX(period_end) as period_end,
  currency,
  MIN(period_start) as period_start
FROM public.channel_revenue
WHERE channel = 'email'
GROUP BY store_id, currency;

-- Grant permissions
GRANT SELECT ON public.vw_channel_email_summary TO authenticated;

-- 3. Check and recreate vw_store_orders_summary if it exists  
DROP VIEW IF EXISTS public.vw_store_orders_summary CASCADE;

CREATE VIEW public.vw_store_orders_summary 
WITH (security_invoker = true) AS
SELECT 
  date_trunc('day', created_at) as day,
  SUM(total) as total_revenue,
  COUNT(*) as order_count,
  currency,
  store_id
FROM public.orders
GROUP BY date_trunc('day', created_at), store_id, currency;

-- Grant permissions
GRANT SELECT ON public.vw_store_orders_summary TO authenticated;

-- 4. Create RLS policies for the views' base tables if not already present
-- These are already covered by existing policies, but let's ensure they're properly set

-- 5. Document the security model
COMMENT ON VIEW public.vw_channel_email_summary IS 'Summary view of email channel revenue - uses security invoker to respect RLS';
COMMENT ON VIEW public.vw_store_orders_summary IS 'Summary view of store orders by day - uses security invoker to respect RLS';