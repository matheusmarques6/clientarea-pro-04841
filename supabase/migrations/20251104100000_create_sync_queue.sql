-- ============================================================================
-- MIGRATION: Create sync_queue table (Nível 2 - Fila Simples)
-- Description: Queue table for background job processing with retry logic
-- Date: 2025-11-04
-- ============================================================================

-- 1. Create sync_queue table
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Period to sync
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Job status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',      -- Waiting to be processed
    'processing',  -- Currently being processed
    'completed',   -- Successfully completed
    'failed'       -- Failed permanently (after max retries)
  )),

  -- Priority (1 = highest, 10 = lowest)
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Error tracking
  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  -- Metadata
  triggered_by UUID REFERENCES auth.users(id),
  meta JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate jobs for same store/period/status
  UNIQUE(store_id, period_start, period_end, status)
);

-- 2. Create indexes for performance
CREATE INDEX idx_sync_queue_status_priority
  ON sync_queue(status, priority, queued_at)
  WHERE status = 'queued';

CREATE INDEX idx_sync_queue_store
  ON sync_queue(store_id);

CREATE INDEX idx_sync_queue_processing
  ON sync_queue(status, started_at)
  WHERE status = 'processing';

CREATE INDEX idx_sync_queue_cleanup
  ON sync_queue(status, started_at)
  WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '10 minutes';

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_sync_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_queue_updated_at();

-- 4. Enable RLS
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view queue jobs for their stores"
  ON sync_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_members
      WHERE store_members.store_id = sync_queue.store_id
        AND store_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert queue jobs for their stores"
  ON sync_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_members
      WHERE store_members.store_id = sync_queue.store_id
        AND store_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update queue jobs for their stores"
  ON sync_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_members
      WHERE store_members.store_id = sync_queue.store_id
        AND store_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to queue"
  ON sync_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Create store_sync_cache table (if not exists from previous migration)
CREATE TABLE IF NOT EXISTS store_sync_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  data_type TEXT NOT NULL CHECK (data_type IN (
    'analytics',
    'orders',
    'campaigns',
    'flows',
    'customers',
    'products'
  )),

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  data JSONB NOT NULL,

  source TEXT NOT NULL CHECK (source IN ('klaviyo', 'shopify', 'combined')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status TEXT NOT NULL DEFAULT 'success' CHECK (sync_status IN ('success', 'error', 'partial')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, data_type, period_start, period_end, source)
);

-- Enable RLS on cache table
ALTER TABLE store_sync_cache ENABLE ROW LEVEL SECURITY;

-- Cache RLS policies
CREATE POLICY "Users can view cache of their stores"
  ON store_sync_cache FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM store_members
      WHERE store_members.store_id = store_sync_cache.store_id
        AND store_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to cache"
  ON store_sync_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Create indexes on cache table
CREATE INDEX IF NOT EXISTS idx_store_sync_cache_store
  ON store_sync_cache(store_id);

CREATE INDEX IF NOT EXISTS idx_store_sync_cache_period
  ON store_sync_cache(store_id, period_start, period_end);

-- 8. Add comments
COMMENT ON TABLE sync_queue IS 'Queue for background sync jobs with retry logic';
COMMENT ON COLUMN sync_queue.status IS 'queued | processing | completed | failed';
COMMENT ON COLUMN sync_queue.priority IS '1-10 (1 = highest priority, processed first)';
COMMENT ON COLUMN sync_queue.retry_count IS 'Number of times this job has been retried';
COMMENT ON COLUMN sync_queue.max_retries IS 'Maximum number of retry attempts before marking as failed';

-- 9. Create view for monitoring
CREATE OR REPLACE VIEW v_sync_queue_stats AS
SELECT
  status,
  COUNT(*) as job_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_duration_seconds,
  MIN(queued_at) as oldest_job_at
FROM sync_queue
WHERE queued_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

COMMENT ON VIEW v_sync_queue_stats IS 'Real-time stats for sync queue monitoring (last 24h)';
