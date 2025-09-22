-- ===== CORREÇÕES DE SEGURANÇA - RLS POLICIES =====

-- 1. RLS e Policies para Integrations
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integrations_rw_policy" ON public.integrations;
CREATE POLICY "integrations_rw_policy" ON public.integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores 
            WHERE user_id = auth.uid() AND store_id = integrations.store_id
        )
    );

-- 2. RLS e Policies para Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_rw_policy" ON public.products;
CREATE POLICY "products_rw_policy" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores 
            WHERE user_id = auth.uid() AND store_id = products.store_id
        )
    );

-- 3. RLS e Policies para Variants
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variants_rw_policy" ON public.variants;
CREATE POLICY "variants_rw_policy" ON public.variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN products p ON p.id = variants.product_id
            WHERE vs.user_id = auth.uid() AND vs.store_id = p.store_id
        )
    );

-- 4. RLS e Policies para Variant Costs
ALTER TABLE public.variant_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variant_costs_rw_policy" ON public.variant_costs;
CREATE POLICY "variant_costs_rw_policy" ON public.variant_costs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN products p ON p.id = (SELECT product_id FROM variants WHERE id = variant_costs.variant_id)
            WHERE vs.user_id = auth.uid() AND vs.store_id = p.store_id
        )
    );

-- 5. RLS e Policies para Variant Cost Audit
ALTER TABLE public.variant_cost_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variant_cost_audit_rw_policy" ON public.variant_cost_audit;
CREATE POLICY "variant_cost_audit_rw_policy" ON public.variant_cost_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN products p ON p.id = (SELECT product_id FROM variants WHERE id = variant_cost_audit.variant_id)
            WHERE vs.user_id = auth.uid() AND vs.store_id = p.store_id
        )
    );

-- 6. RLS e Policies para Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_rw_policy" ON public.orders;
CREATE POLICY "orders_rw_policy" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores 
            WHERE user_id = auth.uid() AND store_id = orders.store_id
        )
    );

-- 7. RLS e Policies para Return Events
ALTER TABLE public.return_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "return_events_rw_policy" ON public.return_events;
CREATE POLICY "return_events_rw_policy" ON public.return_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN returns r ON r.id = return_events.return_id
            WHERE vs.user_id = auth.uid() AND vs.store_id = r.store_id
        )
    );

-- 8. RLS e Policies para Return Labels
ALTER TABLE public.return_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "return_labels_rw_policy" ON public.return_labels;
CREATE POLICY "return_labels_rw_policy" ON public.return_labels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN returns r ON r.id = return_labels.return_id
            WHERE vs.user_id = auth.uid() AND vs.store_id = r.store_id
        )
    );

-- 9. RLS e Policies para Refund Events  
ALTER TABLE public.refund_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund_events_rw_policy" ON public.refund_events;
CREATE POLICY "refund_events_rw_policy" ON public.refund_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN refunds rf ON rf.id = refund_events.refund_id
            WHERE vs.user_id = auth.uid() AND vs.store_id = rf.store_id
        )
    );

-- 10. RLS e Policies para Refund Payments
ALTER TABLE public.refund_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund_payments_rw_policy" ON public.refund_payments;
CREATE POLICY "refund_payments_rw_policy" ON public.refund_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM v_user_stores vs
            JOIN refunds rf ON rf.id = refund_payments.refund_id
            WHERE vs.user_id = auth.uid() AND vs.store_id = rf.store_id
        )
    );

-- 11. Seed de dados demo (apenas se não existir)
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