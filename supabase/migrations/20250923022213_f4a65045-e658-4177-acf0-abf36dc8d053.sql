-- Add integration columns to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shopify_domain TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shopify_access_token TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS klaviyo_private_key TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS klaviyo_site_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stores_shopify_domain ON public.stores(shopify_domain);
CREATE INDEX IF NOT EXISTS idx_stores_klaviyo_site_id ON public.stores(klaviyo_site_id);