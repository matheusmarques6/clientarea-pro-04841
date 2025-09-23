-- Ensure orders table has all required columns for shopify sync
DO $$ 
BEGIN
    -- Add shopify_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shopify_id') THEN
        ALTER TABLE orders ADD COLUMN shopify_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_id);
    END IF;

    -- Add raw column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'raw') THEN
        ALTER TABLE orders ADD COLUMN raw JSONB;
    END IF;

    -- Add customer_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_email') THEN
        ALTER TABLE orders ADD COLUMN customer_email TEXT;
    END IF;

    -- Add customer_id_ext column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id_ext') THEN
        ALTER TABLE orders ADD COLUMN customer_id_ext TEXT;
    END IF;
END $$;