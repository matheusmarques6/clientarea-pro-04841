-- Fix RLS policies for stores table to allow admins to see all stores
DROP POLICY IF EXISTS "read stores" ON public.stores;

-- Create comprehensive RLS policies for stores table
CREATE POLICY "Admins can see all stores"
ON public.stores
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Keep existing policies for regular users if needed
CREATE POLICY "Users can see their associated stores"
ON public.stores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM v_user_stores vus
    WHERE vus.user_id = auth.uid() 
    AND vus.store_id = stores.id
  )
);