-- Remove duplicate/old cron job
SELECT cron.unschedule('auto-sync-klaviyo-hourly');

-- Keep only the new comprehensive auto_sync_all_stores job
-- Verify current jobs
SELECT jobname, schedule, active FROM cron.job;