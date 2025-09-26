-- Fix RLS policy and ensure mapping sync for store visibility

-- 1) Replace the user visibility policy on stores
DROP POLICY IF EXISTS "Users can view their stores" ON public.stores;
CREATE POLICY "Users can view their stores"
ON public.stores
FOR SELECT
USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.v_user_stores vus
    WHERE vus.user_id = auth.uid() AND vus.store_id = stores.id
  ) OR
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.user_id = auth.uid() AND sm.store_id = stores.id
  ) OR
  EXISTS (
    SELECT 1 FROM public.user_store_roles usr
    WHERE usr.user_id = auth.uid() AND usr.store_id = stores.id
  )
);

-- 2) Backfill v_user_stores from both linking tables
INSERT INTO public.v_user_stores (user_id, store_id)
SELECT sm.user_id, sm.store_id FROM public.store_members sm
ON CONFLICT DO NOTHING;

INSERT INTO public.v_user_stores (user_id, store_id)
SELECT usr.user_id, usr.store_id FROM public.user_store_roles usr
ON CONFLICT DO NOTHING;

-- 3) Create triggers to keep v_user_stores in sync from store_members and user_store_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_vus_sm_insert'
  ) THEN
    CREATE TRIGGER trg_sync_vus_sm_insert
    AFTER INSERT ON public.store_members
    FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_vus_sm_update'
  ) THEN
    CREATE TRIGGER trg_sync_vus_sm_update
    AFTER UPDATE ON public.store_members
    FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_vus_sm_delete'
  ) THEN
    CREATE TRIGGER trg_sync_vus_sm_delete
    AFTER DELETE ON public.store_members
    FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_vus_usr_insert'
  ) THEN
    CREATE TRIGGER trg_sync_vus_usr_insert
    AFTER INSERT ON public.user_store_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_vus_usr_update'
  ) THEN
    CREATE TRIGGER trg_sync_vus_usr_update
    AFTER UPDATE ON public.user_store_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_vus_usr_delete'
  ) THEN
    CREATE TRIGGER trg_sync_vus_usr_delete
    AFTER DELETE ON public.user_store_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();
  END IF;
END $$;