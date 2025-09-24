-- Check for views and functions that use SECURITY DEFINER
SELECT 
  schemaname, 
  viewname, 
  definition 
FROM pg_views 
WHERE schemaname = 'public';

-- Check for functions that use SECURITY DEFINER
SELECT 
  routine_name,
  routine_definition,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND security_type = 'DEFINER';

-- Since the security definer views issue might be related to our views or existing functions
-- Let's check which ones need to be fixed
SELECT 
  p.proname, 
  p.prosecdef,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
  AND p.prosecdef = true;