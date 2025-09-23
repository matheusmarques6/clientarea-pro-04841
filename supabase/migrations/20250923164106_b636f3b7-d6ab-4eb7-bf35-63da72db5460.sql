-- Recreate the views to ensure they don't have any security definer properties
-- This should address the remaining security linter warnings

-- Drop and recreate v_user_stores view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.v_user_stores;
CREATE VIEW public.v_user_stores
WITH (security_invoker = true)
AS
SELECT user_id, store_id
FROM store_members;

-- Drop and recreate vw_channel_email_summary view with explicit SECURITY INVOKER  
DROP VIEW IF EXISTS public.vw_channel_email_summary;
CREATE VIEW public.vw_channel_email_summary
WITH (security_invoker = true)
AS
SELECT 
    store_id,
    period_start,
    period_end,
    sum(revenue) AS email_revenue,
    currency
FROM channel_revenue c
WHERE channel = 'email'::text
GROUP BY store_id, period_start, period_end, currency;

-- Drop and recreate vw_store_orders_summary view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.vw_store_orders_summary;
CREATE VIEW public.vw_store_orders_summary
WITH (security_invoker = true)
AS
SELECT 
    store_id,
    date_trunc('day'::text, created_at) AS day,
    sum(total) AS total_revenue,
    count(*) AS order_count,
    currency
FROM orders o
GROUP BY store_id, date_trunc('day'::text, created_at), currency;