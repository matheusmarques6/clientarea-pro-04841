-- Recreate triggers to maintain user-store mappings
DROP TRIGGER IF EXISTS trg_sync_v_user_stores ON public.store_members;
CREATE TRIGGER trg_sync_v_user_stores
AFTER INSERT OR DELETE OR UPDATE ON public.store_members
FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();

DROP TRIGGER IF EXISTS trg_auto_associate_client_users_to_store ON public.stores;
CREATE TRIGGER trg_auto_associate_client_users_to_store
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.auto_associate_client_users_to_store();

DROP TRIGGER IF EXISTS trg_auto_associate_user_to_client_stores ON public.store_members;
CREATE TRIGGER trg_auto_associate_user_to_client_stores
AFTER INSERT ON public.store_members
FOR EACH ROW EXECUTE FUNCTION public.auto_associate_user_to_client_stores();

-- Backfill v_user_stores now that triggers exist
INSERT INTO public.v_user_stores (user_id, store_id)
SELECT DISTINCT sm.user_id, sm.store_id
FROM public.store_members sm
ON CONFLICT DO NOTHING;