-- ============================================================================
-- ADD ENCRYPTED API KEYS COLUMNS
-- Migration to support encrypted storage of API credentials
-- ============================================================================

-- Add encrypted columns to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS shopify_access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS klaviyo_private_key_encrypted TEXT;

-- Add index for better query performance on encrypted columns
CREATE INDEX IF NOT EXISTS idx_stores_encrypted_keys
ON public.stores(id)
WHERE shopify_access_token_encrypted IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.stores.shopify_access_token_encrypted IS
  'AES-256-GCM encrypted Shopify access token';

COMMENT ON COLUMN public.stores.klaviyo_private_key_encrypted IS
  'AES-256-GCM encrypted Klaviyo private API key';

-- Create function to check if store has encrypted credentials
CREATE OR REPLACE FUNCTION public.has_encrypted_credentials(store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = store_id
      AND shopify_access_token_encrypted IS NOT NULL
      AND klaviyo_private_key_encrypted IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION public.has_encrypted_credentials IS
  'Check if a store has encrypted API credentials configured';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.has_encrypted_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_encrypted_credentials TO service_role;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- DROP FUNCTION IF EXISTS public.has_encrypted_credentials(UUID);
-- DROP INDEX IF EXISTS public.idx_stores_encrypted_keys;
-- ALTER TABLE public.stores
--   DROP COLUMN IF EXISTS shopify_access_token_encrypted,
--   DROP COLUMN IF EXISTS klaviyo_private_key_encrypted;
-- ============================================================================
