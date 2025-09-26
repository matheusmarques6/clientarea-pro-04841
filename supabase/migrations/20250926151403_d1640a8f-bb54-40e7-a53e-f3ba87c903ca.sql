-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron jobs for auto sync if they exist (without error if not exists)
DO $$
BEGIN
  PERFORM cron.unschedule('auto_sync_klaviyo_hourly');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

-- Create cron job to run every hour
SELECT cron.schedule(
  'auto_sync_klaviyo_hourly',
  '0 * * * *', -- Run at minute 0 of every hour
  $$
  SELECT net.http_post(
    url:='https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/auto_sync_klaviyo',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzb3RibGJ0cnNocWZpcXl6aXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMzMwODQsImV4cCI6MjA3MzkwOTA4NH0.wfylbuYN8sndCj9cQTnSXV53bp7RJ1eN3bLBHb4gxWg"}'::jsonb,
    body:=jsonb_build_object(
      'trigger', 'cron',
      'timestamp', now()::text
    )
  ) as request_id;
  $$
);

-- Create a table to log cron job executions if not exists
CREATE TABLE IF NOT EXISTS public.cron_execution_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT,
  details JSONB
);

-- Enable RLS on the log table
ALTER TABLE public.cron_execution_log ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view logs if not exists
DO $$
BEGIN
  CREATE POLICY "Admins can view cron logs" 
  ON public.cron_execution_log 
  FOR SELECT 
  USING (is_admin(auth.uid()));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;