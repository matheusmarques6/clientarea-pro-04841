-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create auto sync cron job that runs every hour
SELECT cron.schedule(
  'auto-sync-all-stores-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/auto_sync_all_stores',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzb3RibGJ0cnNocWZpcXl6aXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMzMwODQsImV4cCI6MjA3MzkwOTA4NH0.wfylbuYN8sndCj9cQTnSXV53bp7RJ1eN3bLBHb4gxWg"}'::jsonb,
        body:='{"trigger": "cron", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Check existing cron jobs
SELECT * FROM cron.job;