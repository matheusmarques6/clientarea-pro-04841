-- Create secure function to update store integration credentials
CREATE OR REPLACE FUNCTION public.update_store_integrations(
  p_store_id uuid,
  p_shopify_domain text DEFAULT NULL,
  p_shopify_access_token text DEFAULT NULL,
  p_klaviyo_site_id text DEFAULT NULL,
  p_klaviyo_private_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the calling user has access to this store (any role)
  IF NOT public.user_has_store_access(auth.uid(), p_store_id) THEN
    RAISE EXCEPTION 'Acesso negado à loja especificada';
  END IF;

  UPDATE public.stores s
  SET
    -- Treat empty strings as NULL to allow clearing values
    shopify_domain = COALESCE(NULLIF(p_shopify_domain, ''), s.shopify_domain),
    shopify_access_token = CASE
      WHEN p_shopify_access_token IS NULL THEN s.shopify_access_token  -- do not change
      ELSE NULLIF(p_shopify_access_token, '')                          -- set/new or clear
    END,
    klaviyo_site_id = COALESCE(NULLIF(p_klaviyo_site_id, ''), s.klaviyo_site_id),
    klaviyo_private_key = CASE
      WHEN p_klaviyo_private_key IS NULL THEN s.klaviyo_private_key
      ELSE NULLIF(p_klaviyo_private_key, '')
    END,
    updated_at = now()
  WHERE s.id = p_store_id;
END;
$$;

-- Ensure v_user_stores stays in sync with store_members
DROP TRIGGER IF EXISTS trg_sync_vus_on_store_members ON public.store_members;
CREATE TRIGGER trg_sync_vus_on_store_members
AFTER INSERT OR UPDATE OR DELETE ON public.store_members
FOR EACH ROW EXECUTE FUNCTION public.sync_v_user_stores_from_store_members();