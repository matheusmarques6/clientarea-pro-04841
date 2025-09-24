-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to run auto sync every hour, skipping 3-6 AM BRT
-- This runs at minute 0 of every hour
SELECT cron.schedule(
  'auto-sync-klaviyo-hourly',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/auto_sync_klaviyo',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzb3RibGJ0cnNocWZpcXl6aXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMzMwODQsImV4cCI6MjA3MzkwOTA4NH0.wfylbuYN8sndCj9cQTnSXV53bp7RJ1eN3bLBHb4gxWg"}'::jsonb,
        body:='{"trigger": "cron", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Add an index to optimize job queries for auto sync
CREATE INDEX IF NOT EXISTS idx_n8n_jobs_auto_sync ON n8n_jobs(store_id, period_start, period_end, status) WHERE source = 'auto_sync';

-- Add a function to manually trigger the auto sync (for testing)
CREATE OR REPLACE FUNCTION trigger_auto_sync()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_id BIGINT;
BEGIN
  SELECT net.http_post(
    url:='https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/auto_sync_klaviyo',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzb3RibGJ0cnNocWZpcXl6aXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMzMwODQsImV4cCI6MjA3MzkwOTA4NH0.wfylbuYN8sndCj9cQTnSXV53bp7RJ1eN3bLBHb4gxWg"}'::jsonb,
    body:='{"trigger": "manual", "timestamp": "' || now() || '"}'::jsonb
  ) INTO result_id;
  
  RETURN 'Auto sync triggered with request_id: ' || result_id;
END;
$$;