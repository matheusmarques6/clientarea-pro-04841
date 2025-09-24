-- Fix stores visibility for non-admin users by adding member-select policy,
-- syncing v_user_stores via trigger, and backfilling mappings.

-- 1) Create SELECT policy allowing members to view their stores
CREATE POLICY "Users can view their stores"
ON public.stores
FOR SELECT
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.v_user_stores vus
    WHERE vus.user_id = auth.uid() AND vus.store_id = stores.id
  )
);

-- 2) Ensure trigger exists to sync v_user_stores with store_members
DROP TRIGGER IF EXISTS trg_sync_v_user_stores ON public.store_members;
CREATE TRIGGER trg_sync_v_user_stores
AFTER INSERT OR UPDATE OR DELETE ON public.store_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();

-- 3) Backfill v_user_stores with existing relations
INSERT INTO public.v_user_stores (user_id, store_id)
SELECT sm.user_id, sm.store_id
FROM public.store_members sm
LEFT JOIN public.v_user_stores vus
  ON vus.user_id = sm.user_id AND vus.store_id = sm.store_id
WHERE vus.user_id IS NULL;