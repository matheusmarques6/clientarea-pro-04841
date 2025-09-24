-- Fix the security definer function to use immutable search path
CREATE OR REPLACE FUNCTION trigger_auto_sync()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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