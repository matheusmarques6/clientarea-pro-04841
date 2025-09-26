-- Create a SECURITY DEFINER helper to avoid RLS recursion during policy checks
CREATE OR REPLACE FUNCTION public.user_has_store_access(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.v_user_stores vus
    WHERE vus.user_id = _user_id AND vus.store_id = _store_id
  )
  OR EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.user_id = _user_id AND sm.store_id = _store_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_store_roles usr
    WHERE usr.user_id = _user_id AND usr.store_id = _store_id
  );
$$;

-- Replace visibility policy to use the function
DROP POLICY IF EXISTS "Users can view their stores" ON public.stores;
CREATE POLICY "Users can view their stores"
ON public.stores
FOR SELECT
USING (
  is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), id)
);