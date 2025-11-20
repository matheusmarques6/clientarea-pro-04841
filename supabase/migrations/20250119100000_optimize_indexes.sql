-- ============================================================================
-- PERFORMANCE OPTIMIZATION - DATABASE INDEXES
-- Creates optimized indexes to improve query performance
-- ============================================================================

-- ============================================================================
-- 1. KLAVIYO_SUMMARIES - Most frequently queried table
-- ============================================================================

-- Composite index for dashboard queries (store + period lookup)
-- Covers: WHERE store_id = ? AND period_start = ? AND period_end = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_klaviyo_summaries_store_period
ON public.klaviyo_summaries(store_id, period_start DESC, period_end DESC);

COMMENT ON INDEX idx_klaviyo_summaries_store_period IS
  'Optimizes dashboard queries for latest summaries by store and period';

-- Index for finding latest summary per store
-- Covers: ORDER BY period_start DESC LIMIT 1
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_klaviyo_summaries_latest
ON public.klaviyo_summaries(store_id, period_start DESC)
WHERE period_start IS NOT NULL;

COMMENT ON INDEX idx_klaviyo_summaries_latest IS
  'Optimizes queries for finding the most recent summary per store';

-- ============================================================================
-- 2. CHANNEL_REVENUE - Dashboard revenue breakdown
-- ============================================================================

-- Composite index for channel + store lookups
-- Covers: WHERE store_id = ? AND channel = 'shopify'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channel_revenue_store_channel
ON public.channel_revenue(store_id, channel, period_start DESC);

COMMENT ON INDEX idx_channel_revenue_store_channel IS
  'Optimizes revenue queries by store and channel (email, shopify, etc)';

-- Partial index for Shopify revenue (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channel_revenue_shopify
ON public.channel_revenue(store_id, period_start DESC)
WHERE channel = 'shopify';

COMMENT ON INDEX idx_channel_revenue_shopify IS
  'Partial index for fast Shopify revenue lookups';

-- ============================================================================
-- 3. SYNC_QUEUE - Background job processing
-- ============================================================================

-- Partial index for active jobs (queued or processing)
-- Covers: WHERE status IN ('queued', 'processing') ORDER BY priority DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_queue_active
ON public.sync_queue(status, priority DESC, queued_at ASC)
WHERE status IN ('queued', 'processing');

COMMENT ON INDEX idx_sync_queue_active IS
  'Optimizes worker queries for finding next jobs to process';

-- Index for job status monitoring
-- Covers: WHERE store_id = ? AND status = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_queue_store_status
ON public.sync_queue(store_id, status, queued_at DESC);

COMMENT ON INDEX idx_sync_queue_store_status IS
  'Optimizes queries for monitoring job status per store';

-- ============================================================================
-- 4. N8N_JOBS - Sync job tracking
-- ============================================================================

-- Composite index for job lookup by store and period
-- Covers: WHERE store_id = ? AND period_start = ? AND period_end = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_n8n_jobs_store_period
ON public.n8n_jobs(store_id, period_start, period_end, status);

COMMENT ON INDEX idx_n8n_jobs_store_period IS
  'Optimizes job lookup by store and date range';

-- Index for request_id lookups (webhook callbacks)
-- Covers: WHERE request_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_n8n_jobs_request_id
ON public.n8n_jobs(request_id)
WHERE request_id IS NOT NULL;

COMMENT ON INDEX idx_n8n_jobs_request_id IS
  'Fast lookup for webhook callbacks by request ID';

-- Index for finding recent jobs
-- Covers: WHERE store_id = ? ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_n8n_jobs_recent
ON public.n8n_jobs(store_id, created_at DESC);

COMMENT ON INDEX idx_n8n_jobs_recent IS
  'Optimizes queries for recent job history';

-- ============================================================================
-- 5. STORE_MEMBERS - RLS policy checks (HIGH FREQUENCY)
-- ============================================================================

-- Composite index for RLS policy checks
-- Covers: WHERE user_id = ? AND store_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_members_user_store
ON public.store_members(user_id, store_id);

COMMENT ON INDEX idx_store_members_user_store IS
  'Critical for RLS policy performance - checked on every query';

-- Index for finding stores by user
-- Covers: WHERE user_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_members_user
ON public.store_members(user_id);

COMMENT ON INDEX idx_store_members_user IS
  'Optimizes queries for finding all stores accessible to a user';

-- ============================================================================
-- 6. STORES - Main stores table
-- ============================================================================

-- Index for encrypted credentials lookup
-- Covers: WHERE shopify_access_token_encrypted IS NOT NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stores_has_credentials
ON public.stores(id)
WHERE shopify_access_token_encrypted IS NOT NULL
  AND klaviyo_private_key_encrypted IS NOT NULL;

COMMENT ON INDEX idx_stores_has_credentials IS
  'Partial index for stores with encrypted credentials configured';

-- Index for active stores
-- Covers: WHERE status = 'active'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stores_active
ON public.stores(status, created_at DESC)
WHERE status = 'active';

COMMENT ON INDEX idx_stores_active IS
  'Partial index for active stores only';

-- ============================================================================
-- 7. ORDERS - E-commerce orders
-- ============================================================================

-- Index for order lookups by store and date
-- Covers: WHERE store_id = ? AND created_at BETWEEN ? AND ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_store_date
ON public.orders(store_id, created_at DESC);

COMMENT ON INDEX idx_orders_store_date IS
  'Optimizes order queries by store and creation date';

-- Index for Shopify order ID lookups (external sync)
-- Covers: WHERE shopify_order_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_shopify_id
ON public.orders(shopify_order_id)
WHERE shopify_order_id IS NOT NULL;

COMMENT ON INDEX idx_orders_shopify_id IS
  'Fast lookup for orders by Shopify ID during sync';

-- ============================================================================
-- 8. RETURNS & REFUNDS - Returns management
-- ============================================================================

-- Index for returns by store and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_returns_store_status
ON public.returns(store_id, status, created_at DESC);

COMMENT ON INDEX idx_returns_store_status IS
  'Optimizes returns dashboard queries';

-- Index for refunds by store
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refunds_store
ON public.refunds(store_id, created_at DESC);

COMMENT ON INDEX idx_refunds_store IS
  'Optimizes refunds history queries';

-- ============================================================================
-- 9. ANALYZE TABLES (Update statistics for query planner)
-- ============================================================================

ANALYZE public.klaviyo_summaries;
ANALYZE public.channel_revenue;
ANALYZE public.sync_queue;
ANALYZE public.n8n_jobs;
ANALYZE public.store_members;
ANALYZE public.stores;
ANALYZE public.orders;
ANALYZE public.returns;
ANALYZE public.refunds;

-- ============================================================================
-- 10. INDEX USAGE MONITORING VIEW
-- ============================================================================

-- View to monitor index usage and identify unused indexes
CREATE OR REPLACE VIEW v_index_usage_stats AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE
    WHEN idx_scan = 0 THEN '⚠️ NEVER USED'
    WHEN idx_scan < 100 THEN '⚠️ RARELY USED'
    WHEN idx_scan < 1000 THEN '✅ MODERATELY USED'
    ELSE '✅ HEAVILY USED'
  END AS usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

COMMENT ON VIEW v_index_usage_stats IS
  'Monitor index usage to identify unused or underutilized indexes';

-- Grant access to view
GRANT SELECT ON v_index_usage_stats TO authenticated;
GRANT SELECT ON v_index_usage_stats TO service_role;

-- ============================================================================
-- 11. QUERY PERFORMANCE MONITORING
-- ============================================================================

-- Function to get slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE FUNCTION get_slow_queries(min_duration_ms INTEGER DEFAULT 1000)
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_time_ms NUMERIC,
  mean_time_ms NUMERIC,
  max_time_ms NUMERIC
)
LANGUAGE SQL
AS $$
  SELECT
    query,
    calls,
    ROUND(total_exec_time::NUMERIC, 2) AS total_time_ms,
    ROUND(mean_exec_time::NUMERIC, 2) AS mean_time_ms,
    ROUND(max_exec_time::NUMERIC, 2) AS max_time_ms
  FROM pg_stat_statements
  WHERE mean_exec_time > min_duration_ms
  ORDER BY mean_exec_time DESC
  LIMIT 20;
$$;

COMMENT ON FUNCTION get_slow_queries IS
  'Identify slow queries for optimization (requires pg_stat_statements)';

-- ============================================================================
-- PERFORMANCE TESTING QUERIES
-- ============================================================================

-- Test query performance BEFORE and AFTER creating indexes

-- Query 1: Dashboard data lookup (most common)
-- EXPLAIN ANALYZE
-- SELECT * FROM klaviyo_summaries
-- WHERE store_id = 'uuid-here'
-- AND period_start >= '2025-01-01'
-- ORDER BY period_start DESC
-- LIMIT 1;
-- Expected: Index Scan using idx_klaviyo_summaries_store_period

-- Query 2: Channel revenue by store
-- EXPLAIN ANALYZE
-- SELECT * FROM channel_revenue
-- WHERE store_id = 'uuid-here'
-- AND channel = 'shopify'
-- ORDER BY period_start DESC
-- LIMIT 1;
-- Expected: Index Scan using idx_channel_revenue_shopify

-- Query 3: Next job from queue
-- EXPLAIN ANALYZE
-- SELECT * FROM sync_queue
-- WHERE status = 'queued'
-- ORDER BY priority DESC, queued_at ASC
-- LIMIT 1;
-- Expected: Index Scan using idx_sync_queue_active

-- Query 4: RLS check (happens on every query)
-- EXPLAIN ANALYZE
-- SELECT 1 FROM store_members
-- WHERE user_id = 'user-uuid'
-- AND store_id = 'store-uuid';
-- Expected: Index Only Scan using idx_store_members_user_store

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- DROP INDEX CONCURRENTLY IF EXISTS idx_klaviyo_summaries_store_period;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_klaviyo_summaries_latest;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_channel_revenue_store_channel;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_channel_revenue_shopify;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_sync_queue_active;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_sync_queue_store_status;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_n8n_jobs_store_period;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_n8n_jobs_request_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_n8n_jobs_recent;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_store_members_user_store;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_store_members_user;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_stores_has_credentials;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_stores_active;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_orders_store_date;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_orders_shopify_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_returns_store_status;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_refunds_store;
-- DROP VIEW IF EXISTS v_index_usage_stats;
-- DROP FUNCTION IF EXISTS get_slow_queries;
-- ============================================================================
