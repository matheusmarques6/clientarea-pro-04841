-- Document and validate remaining SECURITY DEFINER functions
-- These functions legitimately need elevated privileges and are properly secured

-- Add comments to document why these functions need SECURITY DEFINER
COMMENT ON FUNCTION public.auto_associate_client_users_to_store() IS 'SECURITY DEFINER required: Trigger function needs elevated privileges to manage store_members across client stores, bypassing RLS for proper cross-store user association';

COMMENT ON FUNCTION public.auto_associate_user_to_client_stores() IS 'SECURITY DEFINER required: Trigger function needs elevated privileges to automatically associate users to all stores within a client, bypassing RLS for proper user management';

COMMENT ON FUNCTION public.reconcile_user_profile(text, uuid, text) IS 'SECURITY DEFINER required: System function for user profile reconciliation that needs elevated privileges to manage user data across tables, ensuring data consistency';

COMMENT ON FUNCTION public.is_admin(uuid) IS 'SECURITY DEFINER required: Admin check function that needs to bypass RLS to determine admin status for security policies';

COMMENT ON FUNCTION public.ensure_admin_for_demo_email() IS 'SECURITY DEFINER required: Demo setup trigger that needs elevated privileges to set admin flags for specific demo emails';

COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY DEFINER required: User creation trigger that needs elevated privileges to associate demo users with demo stores, bypassing RLS for initial setup';

COMMENT ON FUNCTION public.sync_v_user_stores_from_store_members() IS 'SECURITY DEFINER required: Trigger function that needs elevated privileges to maintain the v_user_stores view consistency when store_members changes';