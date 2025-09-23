-- Atualizar store com credenciais Shopify e Klaviyo
UPDATE stores 
SET 
  shopify_domain = 'aokvintage.myshopify.com',
  shopify_access_token = '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',
  klaviyo_private_key = 'pk_401b8b3b2ac30d72b3de023d3367868ef6',
  klaviyo_site_id = 'WQa5Pw'
WHERE id = 'cc232dc0-7ddc-4260-882b-919d062fb42c';

-- Também atualizar a integração Klaviyo se existir
UPDATE integrations 
SET 
  key_public = 'pk_401b8b3b2ac30d72b3de023d3367868ef6',
  extra = jsonb_build_object(
    'private_key', 'pk_401b8b3b2ac30d72b3de023d3367868ef6',
    'site_id', 'WQa5Pw',
    'domain', 'aokvintage.myshopify.com'
  ),
  status = 'connected'
WHERE store_id = 'cc232dc0-7ddc-4260-882b-919d062fb42c' 
  AND provider = 'klaviyo';