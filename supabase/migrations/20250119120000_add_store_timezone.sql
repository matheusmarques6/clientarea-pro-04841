-- ============================================================================
-- DYNAMIC TIMEZONE SUPPORT
-- Adds timezone configuration per store for accurate international data
-- ============================================================================

-- ============================================================================
-- 1. ADD TIMEZONE OFFSET COLUMN
-- ============================================================================

-- Add timezone_offset column (in hours, e.g., -3 for BRT, 0 for UTC)
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;

COMMENT ON COLUMN public.stores.timezone_offset IS
  'Timezone offset in hours from UTC (e.g., -3 for BRT, 0 for UTC, +1 for CET)';

-- ============================================================================
-- 2. ADD TIMEZONE NAME COLUMN (Optional, for UI display)
-- ============================================================================

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS timezone_name TEXT DEFAULT 'UTC';

COMMENT ON COLUMN public.stores.timezone_name IS
  'Human-readable timezone name (e.g., "America/Sao_Paulo", "UTC", "Europe/London")';

-- ============================================================================
-- 3. UPDATE EXISTING STORES WITH DEFAULT TIMEZONE
-- ============================================================================

-- Set default timezone to BRT (-3) for existing stores
-- Change this based on your primary market
UPDATE public.stores
SET
  timezone_offset = -3,
  timezone_name = 'America/Sao_Paulo'
WHERE timezone_offset IS NULL;

-- ============================================================================
-- 4. ADD CONSTRAINT TO ENSURE VALID TIMEZONE OFFSET
-- ============================================================================

-- Timezone offsets range from -12 to +14 hours
ALTER TABLE public.stores
ADD CONSTRAINT check_timezone_offset_range
CHECK (timezone_offset >= -12 AND timezone_offset <= 14);

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to convert UTC timestamp to store's local time
CREATE OR REPLACE FUNCTION public.to_store_timezone(
  utc_timestamp TIMESTAMPTZ,
  store_id UUID
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  offset_hours INTEGER;
BEGIN
  -- Get store's timezone offset
  SELECT timezone_offset INTO offset_hours
  FROM public.stores
  WHERE id = store_id;

  -- If store not found or offset is NULL, return UTC
  IF offset_hours IS NULL THEN
    RETURN utc_timestamp;
  END IF;

  -- Add offset to convert to local time
  RETURN utc_timestamp + (offset_hours || ' hours')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION public.to_store_timezone IS
  'Convert UTC timestamp to store''s local timezone';

-- Function to get date range in store's timezone
CREATE OR REPLACE FUNCTION public.get_store_date_range(
  store_id UUID,
  days_ago INTEGER DEFAULT 30
)
RETURNS TABLE (
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  offset_hours INTEGER;
  local_now TIMESTAMPTZ;
BEGIN
  -- Get store's timezone offset
  SELECT timezone_offset INTO offset_hours
  FROM public.stores
  WHERE id = store_id;

  -- Calculate current time in store's timezone
  local_now := NOW() + (COALESCE(offset_hours, 0) || ' hours')::INTERVAL;

  -- Calculate start of day in local timezone
  start_date := date_trunc('day', local_now - (days_ago || ' days')::INTERVAL);

  -- Calculate end of current day in local timezone
  end_date := date_trunc('day', local_now) + '1 day'::INTERVAL;

  -- Convert back to UTC for storage/API calls
  start_date := start_date - (COALESCE(offset_hours, 0) || ' hours')::INTERVAL;
  end_date := end_date - (COALESCE(offset_hours, 0) || ' hours')::INTERVAL;

  RETURN QUERY SELECT start_date, end_date;
END;
$$;

COMMENT ON FUNCTION public.get_store_date_range IS
  'Get date range for queries, adjusted for store''s timezone';

-- ============================================================================
-- 6. UPDATE DASHBOARD VIEW TO INCLUDE TIMEZONE INFO
-- ============================================================================

-- Drop and recreate dashboard view with timezone info
DROP VIEW IF EXISTS public.v_dashboard_data CASCADE;

CREATE OR REPLACE VIEW v_dashboard_data AS
SELECT
  s.id AS store_id,
  s.name AS store_name,
  s.domain,
  s.status AS store_status,
  s.currency,
  s.country,
  s.timezone_offset,
  s.timezone_name,
  s.klaviyo_metric_id,
  s.created_at AS store_created_at,

  -- Latest Klaviyo summary (using LATERAL join)
  k.id AS summary_id,
  k.period_start,
  k.period_end,
  k.revenue_total,
  k.revenue_campaigns,
  k.revenue_flows,
  k.orders_attributed,
  k.conversions_campaigns,
  k.conversions_flows,
  k.leads_total,
  k.campaign_count,
  k.flow_count,
  k.campaigns_with_revenue,
  k.flows_with_revenue,
  k.flows_with_activity,
  k.shopify_total_sales,
  k.shopify_total_orders,
  k.shopify_new_customers,
  k.shopify_returning_customers,
  k.shopify_today_sales,
  k.updated_at AS summary_updated_at,

  -- Shopify revenue from channel_revenue
  ch.id AS channel_revenue_id,
  ch.revenue AS shopify_revenue,
  ch.orders_count AS shopify_orders_count,
  ch.updated_at AS channel_updated_at

FROM public.stores s

-- Get latest Klaviyo summary for this store
LEFT JOIN LATERAL (
  SELECT *
  FROM public.klaviyo_summaries
  WHERE store_id = s.id
  ORDER BY period_start DESC
  LIMIT 1
) k ON true

-- Get latest Shopify revenue
LEFT JOIN LATERAL (
  SELECT *
  FROM public.channel_revenue
  WHERE store_id = s.id
    AND channel = 'shopify'
  ORDER BY period_start DESC
  LIMIT 1
) ch ON true;

COMMENT ON VIEW v_dashboard_data IS
  'Real-time dashboard data with timezone support';

GRANT SELECT ON v_dashboard_data TO authenticated;
GRANT SELECT ON v_dashboard_data TO service_role;

-- Refresh materialized view
DROP MATERIALIZED VIEW IF EXISTS public.v_dashboard_data_cached;

CREATE MATERIALIZED VIEW v_dashboard_data_cached AS
SELECT * FROM v_dashboard_data;

CREATE UNIQUE INDEX idx_dashboard_cache_store
ON v_dashboard_data_cached(store_id);

GRANT SELECT ON v_dashboard_data_cached TO authenticated;
GRANT SELECT ON v_dashboard_data_cached TO service_role;

-- ============================================================================
-- 7. COMMON TIMEZONES REFERENCE TABLE (Optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.timezones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  offset_hours INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  country_code TEXT
);

COMMENT ON TABLE public.timezones IS
  'Reference table of common timezones for UI selection';

-- Insert common timezones
INSERT INTO public.timezones (name, offset_hours, display_name, country_code) VALUES
  ('UTC', 0, 'UTC (Coordinated Universal Time)', NULL),
  ('America/Sao_Paulo', -3, 'BRT (Brasília Time) UTC-3', 'BR'),
  ('America/New_York', -5, 'EST (Eastern Time) UTC-5', 'US'),
  ('America/Chicago', -6, 'CST (Central Time) UTC-6', 'US'),
  ('America/Denver', -7, 'MST (Mountain Time) UTC-7', 'US'),
  ('America/Los_Angeles', -8, 'PST (Pacific Time) UTC-8', 'US'),
  ('Europe/London', 0, 'GMT (Greenwich Mean Time) UTC+0', 'GB'),
  ('Europe/Paris', 1, 'CET (Central European Time) UTC+1', 'FR'),
  ('Europe/Berlin', 1, 'CET (Central European Time) UTC+1', 'DE'),
  ('Asia/Tokyo', 9, 'JST (Japan Standard Time) UTC+9', 'JP'),
  ('Australia/Sydney', 10, 'AEST (Australian Eastern Time) UTC+10', 'AU')
ON CONFLICT (name) DO NOTHING;

GRANT SELECT ON public.timezones TO authenticated;
GRANT SELECT ON public.timezones TO service_role;

-- ============================================================================
-- 8. CREATE INDEX FOR TIMEZONE QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stores_timezone
ON public.stores(timezone_offset, timezone_name);

-- ============================================================================
-- 9. TESTING QUERIES
-- ============================================================================

-- Test 1: Get date range for a specific store
-- SELECT * FROM get_store_date_range('store-uuid-here', 30);

-- Test 2: Convert UTC timestamp to store's local time
-- SELECT to_store_timezone(NOW(), 'store-uuid-here');

-- Test 3: Verify all stores have timezone set
-- SELECT id, name, timezone_offset, timezone_name
-- FROM stores
-- WHERE timezone_offset IS NULL OR timezone_name IS NULL;

-- Test 4: Get dashboard data with timezone info
-- SELECT store_id, store_name, timezone_offset, timezone_name
-- FROM v_dashboard_data
-- LIMIT 5;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- DROP TABLE IF EXISTS public.timezones;
-- DROP FUNCTION IF EXISTS public.get_store_date_range(UUID, INTEGER);
-- DROP FUNCTION IF EXISTS public.to_store_timezone(TIMESTAMPTZ, UUID);
-- ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS check_timezone_offset_range;
-- ALTER TABLE public.stores DROP COLUMN IF EXISTS timezone_name;
-- ALTER TABLE public.stores DROP COLUMN IF EXISTS timezone_offset;
-- ============================================================================
