-- Fix any remaining SECURITY DEFINER views in the public schema
-- First, let's recreate v_user_stores if it has SECURITY DEFINER

DROP VIEW IF EXISTS public.v_user_stores CASCADE;

CREATE VIEW public.v_user_stores 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  store_id
FROM public.store_members;

-- Grant appropriate permissions
GRANT SELECT ON public.v_user_stores TO authenticated;

COMMENT ON VIEW public.v_user_stores IS 'View of user-store relationships - uses security invoker to respect RLS';

-- Now let's check if there are any views in the vault schema that need fixing
-- The vault.decrypted_secrets view should NOT be modified as it's managed by Supabase

-- Add documentation
COMMENT ON VIEW public.v_user_stores IS 'Maps users to their associated stores through store_members table - respects RLS policies';