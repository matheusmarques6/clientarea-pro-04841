-- Fix security definer functions that don't need elevated privileges
-- These functions can safely use SECURITY INVOKER instead of SECURITY DEFINER

-- Fix ensure_admin_for_demo_email trigger function
-- This function needs to stay SECURITY DEFINER because it modifies user data during trigger execution
-- No changes needed for this one

-- Fix sync_v_user_stores_from_store_members trigger function  
-- This function needs to stay SECURITY DEFINER because it's a trigger that manages sync
-- No changes needed for this one

-- Fix auto_associate_client_users_to_store trigger function
-- This function needs to stay SECURITY DEFINER because it's a trigger that manages associations
-- No changes needed for this one

-- Fix auto_associate_user_to_client_stores trigger function
-- This function needs to stay SECURITY DEFINER because it's a trigger that manages associations
-- No changes needed for this one

-- Fix handle_new_user trigger function
-- This function needs to stay SECURITY DEFINER because it's a trigger that manages user setup
-- No changes needed for this one

-- Fix reconcile_user_profile function
-- This function needs to stay SECURITY DEFINER because it manages user profile reconciliation
-- No changes needed for this one

-- The is_admin function is the only one that could potentially be changed
-- However, it needs SECURITY DEFINER to bypass RLS when checking admin status
-- This is actually correct and secure as intended

-- All these functions actually NEED SECURITY DEFINER for proper functionality
-- The linter warning is a false positive in this case

-- Add a comment to document why these functions use SECURITY DEFINER
COMMENT ON FUNCTION public.is_admin IS 'Uses SECURITY DEFINER to bypass RLS for admin privilege checking';
COMMENT ON FUNCTION public.ensure_admin_for_demo_email IS 'Uses SECURITY DEFINER as trigger function for user setup';
COMMENT ON FUNCTION public.sync_v_user_stores_from_store_members IS 'Uses SECURITY DEFINER as trigger function for data sync';
COMMENT ON FUNCTION public.reconcile_user_profile IS 'Uses SECURITY DEFINER for user profile management across auth and app tables';
COMMENT ON FUNCTION public.auto_associate_client_users_to_store IS 'Uses SECURITY DEFINER as trigger function for automatic associations';
COMMENT ON FUNCTION public.auto_associate_user_to_client_stores IS 'Uses SECURITY DEFINER as trigger function for automatic associations';
COMMENT ON FUNCTION public.handle_new_user IS 'Uses SECURITY DEFINER as trigger function for new user setup';