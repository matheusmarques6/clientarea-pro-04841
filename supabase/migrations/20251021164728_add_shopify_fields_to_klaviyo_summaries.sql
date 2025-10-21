-- Add Shopify total sales and customer data to klaviyo_summaries
-- This allows us to calculate the real impact percentage of Convertfy
-- Impact % = (Convertfy Revenue / Shopify Total Sales) * 100

ALTER TABLE public.klaviyo_summaries
ADD COLUMN IF NOT EXISTS shopify_total_sales numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shopify_total_orders integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shopify_new_customers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shopify_returning_customers integer DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.klaviyo_summaries.shopify_total_sales IS 'Total sales from Shopify for this period (baseline for impact calculation)';
COMMENT ON COLUMN public.klaviyo_summaries.shopify_total_orders IS 'Total number of orders from Shopify for this period';
COMMENT ON COLUMN public.klaviyo_summaries.shopify_new_customers IS 'Number of new customers (first-time buyers) from Shopify';
COMMENT ON COLUMN public.klaviyo_summaries.shopify_returning_customers IS 'Number of returning customers from Shopify';
