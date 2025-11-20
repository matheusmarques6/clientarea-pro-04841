-- ============================================================================
-- DASHBOARD OPTIMIZED VIEWS
-- Creates materialized views to eliminate N+1 queries
-- ============================================================================

-- ============================================================================
-- 1. DASHBOARD DATA VIEW (Combines stores + summaries + revenue)
-- ============================================================================

-- Regular view for real-time data
CREATE OR REPLACE VIEW v_dashboard_data AS
SELECT
  s.id AS store_id,
  s.name AS store_name,
  s.domain,
  s.status AS store_status,
  s.currency,
  s.country,
  s.timezone_offset,
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
  'Real-time dashboard data combining stores, latest summaries, and revenue';

-- Grant access
GRANT SELECT ON v_dashboard_data TO authenticated;
GRANT SELECT ON v_dashboard_data TO service_role;

-- ============================================================================
-- 2. MATERIALIZED VIEW (Cached for ultra-fast queries)
-- ============================================================================

CREATE MATERIALIZED VIEW v_dashboard_data_cached AS
SELECT * FROM v_dashboard_data;

-- Create unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_dashboard_cache_store
ON v_dashboard_data_cached(store_id);

COMMENT ON MATERIALIZED VIEW v_dashboard_data_cached IS
  'Cached dashboard data - refresh after sync completes';

-- Grant access
GRANT SELECT ON v_dashboard_data_cached TO authenticated;
GRANT SELECT ON v_dashboard_data_cached TO service_role;

-- ============================================================================
-- 3. AUTO-REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh materialized view concurrently (doesn't lock table)
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_dashboard_data_cached;

  RAISE NOTICE 'Dashboard cache refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_dashboard_cache IS
  'Refresh dashboard materialized view - call after sync completes';

GRANT EXECUTE ON FUNCTION refresh_dashboard_cache TO service_role;

-- ============================================================================
-- 4. AUTO-REFRESH TRIGGER
-- ============================================================================

-- Trigger function to refresh cache when summaries update
CREATE OR REPLACE FUNCTION trigger_refresh_dashboard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh in background (async)
  PERFORM refresh_dashboard_cache();
  RETURN NEW;
END;
$$;

-- Trigger on klaviyo_summaries updates
CREATE TRIGGER refresh_dashboard_on_summary_update
AFTER INSERT OR UPDATE ON public.klaviyo_summaries
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_dashboard();

COMMENT ON TRIGGER refresh_dashboard_on_summary_update ON public.klaviyo_summaries IS
  'Auto-refresh dashboard cache when summaries are updated';

-- Trigger on channel_revenue updates
CREATE TRIGGER refresh_dashboard_on_revenue_update
AFTER INSERT OR UPDATE ON public.channel_revenue
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_dashboard();

COMMENT ON TRIGGER refresh_dashboard_on_revenue_update ON public.channel_revenue IS
  'Auto-refresh dashboard cache when revenue is updated';

-- ============================================================================
-- 5. STORE SUMMARY VIEW (Alternative simplified view)
-- ============================================================================

CREATE OR REPLACE VIEW v_store_summary AS
SELECT
  s.id,
  s.name,
  s.domain,
  s.status,

  -- Summary counts
  (SELECT COUNT(*) FROM klaviyo_summaries WHERE store_id = s.id) AS total_syncs,
  (SELECT MAX(period_end) FROM klaviyo_summaries WHERE store_id = s.id) AS last_sync_period,
  (SELECT MAX(updated_at) FROM klaviyo_summaries WHERE store_id = s.id) AS last_updated,

  -- Latest revenue
  (SELECT revenue_total FROM klaviyo_summaries
   WHERE store_id = s.id
   ORDER BY period_start DESC
   LIMIT 1) AS latest_revenue,

  -- Member count
  (SELECT COUNT(*) FROM store_members WHERE store_id = s.id) AS member_count,

  -- Has credentials
  (s.shopify_access_token_encrypted IS NOT NULL AND
   s.klaviyo_private_key_encrypted IS NOT NULL) AS has_credentials

FROM public.stores s;

COMMENT ON VIEW v_store_summary IS
  'Simplified store summary for list views';

GRANT SELECT ON v_store_summary TO authenticated;
GRANT SELECT ON v_store_summary TO service_role;

-- ============================================================================
-- 6. PERFORMANCE COMPARISON FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION compare_query_performance()
RETURNS TABLE (
  query_type TEXT,
  old_method_ms NUMERIC,
  new_method_ms NUMERIC,
  improvement_percent NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  old_time NUMERIC;
  new_time NUMERIC;
  test_store_id UUID;
BEGIN
  -- Get a random store for testing
  SELECT id INTO test_store_id FROM stores LIMIT 1;

  -- Test 1: Old method (N+1 queries)
  start_time := clock_timestamp();

  PERFORM (
    SELECT s.*,
           (SELECT * FROM klaviyo_summaries WHERE store_id = s.id ORDER BY period_start DESC LIMIT 1),
           (SELECT * FROM channel_revenue WHERE store_id = s.id AND channel = 'shopify' ORDER BY period_start DESC LIMIT 1)
    FROM stores s
    WHERE s.id = test_store_id
  );

  end_time := clock_timestamp();
  old_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));

  -- Test 2: New method (single query with view)
  start_time := clock_timestamp();

  PERFORM * FROM v_dashboard_data WHERE store_id = test_store_id;

  end_time := clock_timestamp();
  new_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));

  -- Return comparison
  RETURN QUERY
  SELECT
    'Dashboard Data Fetch'::TEXT,
    old_time,
    new_time,
    ROUND(((old_time - new_time) / old_time * 100), 2);
END;
$$;

COMMENT ON FUNCTION compare_query_performance IS
  'Compare performance of old N+1 queries vs new optimized views';

GRANT EXECUTE ON FUNCTION compare_query_performance TO service_role;

-- ============================================================================
-- 7. CACHE STATISTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_cache_statistics AS
SELECT
  'v_dashboard_data_cached'::TEXT AS view_name,
  pg_size_pretty(pg_total_relation_size('v_dashboard_data_cached')) AS total_size,
  (SELECT COUNT(*) FROM v_dashboard_data_cached) AS row_count,
  (SELECT MAX(summary_updated_at) FROM v_dashboard_data_cached) AS last_data_update,
  pg_stat_get_last_analyze_time('v_dashboard_data_cached'::regclass) AS last_analyzed;

COMMENT ON VIEW v_cache_statistics IS
  'Statistics about dashboard cache';

GRANT SELECT ON v_cache_statistics TO authenticated;
GRANT SELECT ON v_cache_statistics TO service_role;

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- Test 1: Compare old vs new method
-- SELECT * FROM compare_query_performance();

-- Test 2: Verify data consistency
-- SELECT
--   (SELECT COUNT(*) FROM v_dashboard_data) AS view_count,
--   (SELECT COUNT(*) FROM stores) AS stores_count;

-- Test 3: Check cache freshness
-- SELECT * FROM v_cache_statistics;

-- Test 4: Manual refresh
-- SELECT refresh_dashboard_cache();

-- Test 5: Query performance
-- EXPLAIN ANALYZE
-- SELECT * FROM v_dashboard_data WHERE store_id = 'uuid-here';

-- ============================================================================
-- INITIAL DATA POPULATION
-- ============================================================================

-- Populate materialized view with initial data
REFRESH MATERIALIZED VIEW v_dashboard_data_cached;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- DROP TRIGGER IF EXISTS refresh_dashboard_on_summary_update ON klaviyo_summaries;
-- DROP TRIGGER IF EXISTS refresh_dashboard_on_revenue_update ON channel_revenue;
-- DROP FUNCTION IF EXISTS trigger_refresh_dashboard();
-- DROP FUNCTION IF EXISTS refresh_dashboard_cache();
-- DROP FUNCTION IF EXISTS compare_query_performance();
-- DROP MATERIALIZED VIEW IF EXISTS v_dashboard_data_cached;
-- DROP VIEW IF EXISTS v_dashboard_data;
-- DROP VIEW IF EXISTS v_store_summary;
-- DROP VIEW IF EXISTS v_cache_statistics;
-- ============================================================================
