-- Backfill existing memberships into v_user_stores
INSERT INTO public.v_user_stores (user_id, store_id)
SELECT sm.user_id, sm.store_id
FROM public.store_members sm
LEFT JOIN public.v_user_stores vus
  ON vus.user_id = sm.user_id AND vus.store_id = sm.store_id
WHERE vus.user_id IS NULL;

-- Function to sync v_user_stores from store_members on INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.sync_v_user_stores_from_store_members()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.v_user_stores (user_id, store_id)
    SELECT NEW.user_id, NEW.store_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.v_user_stores 
      WHERE user_id = NEW.user_id AND store_id = NEW.store_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.v_user_stores
    WHERE user_id = OLD.user_id AND store_id = OLD.store_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- remove old mapping
    DELETE FROM public.v_user_stores
    WHERE user_id = OLD.user_id AND store_id = OLD.store_id;
    -- add new mapping if not exists
    INSERT INTO public.v_user_stores (user_id, store_id)
    SELECT NEW.user_id, NEW.store_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.v_user_stores 
      WHERE user_id = NEW.user_id AND store_id = NEW.store_id
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for sync on store_members
DROP TRIGGER IF EXISTS trg_store_members_sync_vus_ins ON public.store_members;
DROP TRIGGER IF EXISTS trg_store_members_sync_vus_del ON public.store_members;
DROP TRIGGER IF EXISTS trg_store_members_sync_vus_upd ON public.store_members;

CREATE TRIGGER trg_store_members_sync_vus_ins
AFTER INSERT ON public.store_members
FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();

CREATE TRIGGER trg_store_members_sync_vus_del
AFTER DELETE ON public.store_members
FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();

CREATE TRIGGER trg_store_members_sync_vus_upd
AFTER UPDATE OF user_id, store_id ON public.store_members
FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();