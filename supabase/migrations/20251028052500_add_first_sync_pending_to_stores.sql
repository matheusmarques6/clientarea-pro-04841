-- Add first_sync_pending column to stores table
-- This column tracks if a store needs its first synchronization

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS first_sync_pending boolean DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN public.stores.first_sync_pending IS 'Indicates if the store has credentials configured but hasnt performed the first sync yet';

-- Update existing stores with credentials to mark them as pending sync
UPDATE public.stores
SET first_sync_pending = true
WHERE (
  (klaviyo_private_key IS NOT NULL AND klaviyo_site_id IS NOT NULL)
  OR
  (shopify_access_token IS NOT NULL AND shopify_domain IS NOT NULL)
)
AND status != 'connected'
AND first_sync_pending IS NULL;
