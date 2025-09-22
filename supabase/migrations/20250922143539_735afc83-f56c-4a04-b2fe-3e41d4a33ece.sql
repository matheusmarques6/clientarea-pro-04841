-- ===== CONVERTFY SISTEMA COMPLETO - MIGRATIONS IDEMPOTENTES =====

-- 1. Enums para tipos de dados
DO $$ BEGIN
    CREATE TYPE role_type AS ENUM ('owner', 'manager', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE return_status AS ENUM ('new', 'review', 'approved', 'awaiting_post', 'received_wh', 'closed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('requested', 'review', 'approved', 'processing', 'done', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_provider AS ENUM ('shopify', 'klaviyo', 'sms', 'whatsapp');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_status AS ENUM ('connected', 'error', 'disconnected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_attribution AS ENUM ('email', 'sms', 'whatsapp', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Função para trigger de updated_at (se não existir)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $$ LANGUAGE plpgsql;

-- 3. Tabela de clientes (se não existir)
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 4. Ajustar tabela stores para incluir customer_id se não existir
DO $$ BEGIN
    ALTER TABLE public.stores ADD COLUMN customer_id uuid REFERENCES public.customers(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. Tabela de integracões (credenciais API)
CREATE TABLE IF NOT EXISTS public.integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    provider integration_provider NOT NULL,
    key_public text,
    key_secret_encrypted text,
    extra jsonb DEFAULT '{}',
    status integration_status DEFAULT 'disconnected',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(store_id, provider)
);

-- 6. Tabela de produtos (preparada para Shopify)
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id_ext text, -- ID externo (Shopify)
    title text NOT NULL,
    image_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(store_id, product_id_ext)
);

-- 7. Tabela de variantes de produtos
CREATE TABLE IF NOT EXISTS public.variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id_ext text, -- ID externo (Shopify)
    sku text NOT NULL,
    title text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    image_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(sku),
    UNIQUE(product_id, variant_id_ext)
);

-- 8. Tabela de custos de variantes
CREATE TABLE IF NOT EXISTS public.variant_costs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id uuid REFERENCES public.variants(id) ON DELETE CASCADE,
    cost_brl numeric,
    cost_usd numeric,
    cost_eur numeric,
    cost_gbp numeric,
    updated_by uuid REFERENCES auth.users(id),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(variant_id)
);

-- 9. Auditoria de custos de variantes
CREATE TABLE IF NOT EXISTS public.variant_cost_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id uuid REFERENCES public.variants(id) ON DELETE CASCADE,
    field text NOT NULL,
    old_value numeric,
    new_value numeric,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 10. Tabela de eventos de returns
CREATE TABLE IF NOT EXISTS public.return_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id uuid REFERENCES public.returns(id) ON DELETE CASCADE,
    from_status return_status,
    to_status return_status NOT NULL,
    reason text,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 11. Tabela de etiquetas/labels de returns
CREATE TABLE IF NOT EXISTS public.return_labels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id uuid REFERENCES public.returns(id) ON DELETE CASCADE,
    provider text NOT NULL DEFAULT 'mock',
    code text NOT NULL,
    url text,
    created_at timestamptz DEFAULT now()
);

-- 12. Tabela de eventos de refunds
CREATE TABLE IF NOT EXISTS public.refund_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id uuid REFERENCES public.refunds(id) ON DELETE CASCADE,
    from_status refund_status,
    to_status refund_status NOT NULL,
    reason text,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 13. Tabela de pagamentos de refunds (mock)
CREATE TABLE IF NOT EXISTS public.refund_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id uuid REFERENCES public.refunds(id) ON DELETE CASCADE,
    method text NOT NULL,
    transaction_id text,
    amount numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 14. Tabela de pedidos (para dashboard)
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    code text NOT NULL,
    total numeric NOT NULL DEFAULT 0,
    currency text DEFAULT 'BRL',
    channel_attrib channel_attribution DEFAULT 'none',
    created_at timestamptz DEFAULT now(),
    UNIQUE(store_id, code)
);

-- 15. Triggers para updated_at
DO $$ BEGIN
    CREATE TRIGGER update_integrations_updated_at
        BEFORE UPDATE ON public.integrations
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON public.products
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_variants_updated_at
        BEFORE UPDATE ON public.variants
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 16. Índices para performance
CREATE INDEX IF NOT EXISTS idx_returns_store_status ON public.returns(store_id, status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns(created_at);
CREATE INDEX IF NOT EXISTS idx_refunds_store_status ON public.refunds(store_id, status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at);
CREATE INDEX IF NOT EXISTS idx_return_events_return_id ON public.return_events(return_id, created_at);
CREATE INDEX IF NOT EXISTS idx_refund_events_refund_id ON public.refund_events(refund_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_store_date ON public.orders(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.variants(sku);

-- 17. RLS Policies para novas tabelas

-- Integrations
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "integrations_rw_policy" ON public.integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores 
            WHERE user_id = auth.uid() AND store_id = integrations.store_id
        )
    );

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "products_rw_policy" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores 
            WHERE user_id = auth.uid() AND store_id = products.store_id
        )
    );

-- Variants
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "variants_rw_policy" ON public.variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN products p ON p.id = variants.product_id
            WHERE vs.user_id = auth.uid() AND vs.store_id = p.store_id
        )
    );

-- Variant Costs
ALTER TABLE public.variant_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "variant_costs_rw_policy" ON public.variant_costs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN products p ON p.id = (SELECT product_id FROM variants WHERE id = variant_costs.variant_id)
            WHERE vs.user_id = auth.uid() AND vs.store_id = p.store_id
        )
    );

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "orders_rw_policy" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores 
            WHERE user_id = auth.uid() AND store_id = orders.store_id
        )
    );

-- Return Events
ALTER TABLE public.return_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "return_events_rw_policy" ON public.return_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN returns r ON r.id = return_events.return_id
            WHERE vs.user_id = auth.uid() AND vs.store_id = r.store_id
        )
    );

-- Refund Events  
ALTER TABLE public.refund_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "refund_events_rw_policy" ON public.refund_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN refunds rf ON rf.id = refund_events.refund_id
            WHERE vs.user_id = auth.uid() AND vs.store_id = rf.store_id
        )
    );

-- 18. Seed básico de dados demo (apenas se não existir)
DO $$
BEGIN
    -- Cliente demo
    INSERT INTO public.customers (id, name) 
    VALUES ('11111111-1111-1111-1111-111111111111', 'Cliente Demo')
    ON CONFLICT (id) DO NOTHING;
    
    -- Atualizar stores existentes para ter customer_id se estiver NULL
    UPDATE public.stores 
    SET customer_id = '11111111-1111-1111-1111-111111111111'
    WHERE customer_id IS NULL;
    
    -- Seed alguns produtos demo para a primeira loja
    INSERT INTO public.products (id, store_id, title, product_id_ext) 
    SELECT 
        gen_random_uuid(),
        '550e8400-e29b-41d4-a716-446655440001',
        'Produto Demo ' || i,
        'demo_product_' || i
    FROM generate_series(1, 5) i
    ON CONFLICT (store_id, product_id_ext) DO NOTHING;
    
    -- Seed algumas variantes demo
    INSERT INTO public.variants (product_id, sku, title, price, variant_id_ext)
    SELECT 
        p.id,
        'SKU-DEMO-' || (ROW_NUMBER() OVER()),
        p.title || ' - Variante 1',
        (random() * 500 + 50)::numeric(10,2),
        'demo_variant_' || (ROW_NUMBER() OVER())
    FROM public.products p 
    WHERE p.store_id = '550e8400-e29b-41d4-a716-446655440001'
    ON CONFLICT (sku) DO NOTHING;
    
    -- Seed alguns pedidos demo
    INSERT INTO public.orders (store_id, code, total, channel_attrib)
    SELECT 
        '550e8400-e29b-41d4-a716-446655440001',
        'ORD-' || LPAD(i::text, 6, '0'),
        (random() * 1000 + 100)::numeric(10,2),
        CASE (random() * 4)::int 
            WHEN 0 THEN 'email'::channel_attribution
            WHEN 1 THEN 'sms'::channel_attribution  
            WHEN 2 THEN 'whatsapp'::channel_attribution
            ELSE 'none'::channel_attribution
        END
    FROM generate_series(1, 50) i
    ON CONFLICT (store_id, code) DO NOTHING;
END $$;