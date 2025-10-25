-- Returns Management System - Foundation Schema
-- Priorities: 1=Tracking, 2=Shopify Integration, 3=Labels, 4=Refunds, 5=Portal

-- ============================================================
-- ENUM Types
-- ============================================================

DO $$ BEGIN
    CREATE TYPE request_type AS ENUM (
        'return',     -- Cliente quer devolver e receber reembolso
        'exchange'    -- Cliente quer trocar por outro produto
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM (
        'new',              -- Solicitação criada, aguardando revisão
        'in_review',        -- Em análise pelo suporte
        'approved',         -- Aprovada, aguardando postagem do cliente
        'awaiting_post',    -- Aguardando cliente postar o produto
        'in_transit',       -- Produto em trânsito (tracking ativo)
        'received',         -- Produto recebido no centro de devolução
        'completed',        -- Processo finalizado (reembolso feito ou troca enviada)
        'rejected'          -- Solicitação rejeitada
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM (
        'created',
        'status_changed',
        'note_added',
        'tracking_updated',
        'label_generated',
        'refund_issued',
        'exchange_shipped'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE label_status AS ENUM (
        'pending',
        'generated',
        'printed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Main Tables
-- ============================================================

-- Requests Table (Priority 1 - Tracking)
-- Enhanced version with better Shopify integration and tracking
CREATE TABLE IF NOT EXISTS public.rm_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,  -- Tracking code gerado (ex: "RET-2024-001234")

    -- Relacionamentos
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,

    -- Informações do Cliente (Priority 2 - Shopify Integration)
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    order_code TEXT NOT NULL,  -- Código do pedido original na Shopify
    shopify_order_id TEXT,     -- ID do pedido na Shopify (após integração)

    -- Tipo e Status
    type request_type NOT NULL,
    status request_status NOT NULL DEFAULT 'new',

    -- Detalhes da Solicitação
    reason TEXT NOT NULL,
    customer_notes TEXT,
    admin_notes TEXT,

    -- Valores Financeiros
    refund_amount NUMERIC(10,2),
    currency TEXT DEFAULT 'BRL',

    -- Endereços
    return_address JSONB,  -- Endereço para onde cliente deve enviar
    customer_address JSONB,  -- Endereço do cliente (para troca)

    -- Tracking (Priority 1)
    tracking_code TEXT,  -- Código de rastreio do envio de volta
    tracking_carrier TEXT,  -- Transportadora
    tracking_url TEXT,  -- URL de rastreamento

    -- Datas
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Metadados
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Request Items Table
CREATE TABLE IF NOT EXISTS public.rm_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.rm_requests(id) ON DELETE CASCADE,

    -- Produto Original
    shopify_product_id TEXT,
    shopify_variant_id TEXT,
    product_name TEXT NOT NULL,
    variant_title TEXT,
    sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC(10,2),

    -- Imagens
    image_url TEXT,

    -- Para Trocas
    exchange_for_product_id TEXT,
    exchange_for_variant_id TEXT,
    exchange_for_product_name TEXT,
    exchange_for_variant_title TEXT,

    -- Condição do Item
    condition TEXT,  -- 'new', 'used', 'damaged'
    condition_notes TEXT,

    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Request Events Table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.rm_request_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.rm_requests(id) ON DELETE CASCADE,

    -- Tipo e Descrição
    event_type event_type NOT NULL,
    description TEXT NOT NULL,

    -- Responsável
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,

    -- Status Change
    old_status request_status,
    new_status request_status,

    -- Dados Extras
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping Labels Table (Priority 3)
CREATE TABLE IF NOT EXISTS public.rm_shipping_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.rm_requests(id) ON DELETE CASCADE,

    -- Label Info
    label_url TEXT,  -- URL para download do PDF
    tracking_code TEXT,
    carrier TEXT NOT NULL,  -- 'correios', 'fedex', 'dhl', 'ups', etc.
    service_type TEXT,  -- 'express', 'standard', 'economy'

    -- Endereços
    from_address JSONB NOT NULL,
    to_address JSONB NOT NULL,

    -- Custos
    cost NUMERIC(10,2),
    currency TEXT DEFAULT 'BRL',

    -- Status
    status label_status NOT NULL DEFAULT 'pending',

    -- Provider Info (API response)
    provider_label_id TEXT,
    provider_response JSONB,

    -- Datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    generated_at TIMESTAMPTZ,
    printed_at TIMESTAMPTZ,

    -- Metadados
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Refunds Table (Priority 4)
CREATE TABLE IF NOT EXISTS public.rm_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.rm_requests(id) ON DELETE CASCADE,

    -- Valores
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',

    -- Método de Reembolso
    refund_method TEXT,  -- 'original_payment', 'store_credit', 'manual'

    -- Status
    status refund_status NOT NULL DEFAULT 'pending',

    -- Shopify Integration
    shopify_refund_id TEXT,
    shopify_transaction_id TEXT,

    -- Detalhes
    reason TEXT,
    notes TEXT,

    -- Provider Info
    provider_response JSONB,
    error_message TEXT,

    -- Datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Metadados
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- Indexes for Performance
-- ============================================================

-- Requests indexes
CREATE INDEX IF NOT EXISTS idx_rm_requests_store_id ON public.rm_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_rm_requests_code ON public.rm_requests(code);
CREATE INDEX IF NOT EXISTS idx_rm_requests_status ON public.rm_requests(status);
CREATE INDEX IF NOT EXISTS idx_rm_requests_customer_email ON public.rm_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_rm_requests_order_code ON public.rm_requests(order_code);
CREATE INDEX IF NOT EXISTS idx_rm_requests_tracking_code ON public.rm_requests(tracking_code);
CREATE INDEX IF NOT EXISTS idx_rm_requests_created_at ON public.rm_requests(created_at DESC);

-- Request items indexes
CREATE INDEX IF NOT EXISTS idx_rm_request_items_request_id ON public.rm_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_rm_request_items_shopify_product_id ON public.rm_request_items(shopify_product_id);

-- Request events indexes
CREATE INDEX IF NOT EXISTS idx_rm_request_events_request_id ON public.rm_request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_rm_request_events_created_at ON public.rm_request_events(created_at DESC);

-- Shipping labels indexes
CREATE INDEX IF NOT EXISTS idx_rm_shipping_labels_request_id ON public.rm_shipping_labels(request_id);
CREATE INDEX IF NOT EXISTS idx_rm_shipping_labels_tracking_code ON public.rm_shipping_labels(tracking_code);

-- Refunds indexes
CREATE INDEX IF NOT EXISTS idx_rm_refunds_request_id ON public.rm_refunds(request_id);
CREATE INDEX IF NOT EXISTS idx_rm_refunds_status ON public.rm_refunds(status);

-- ============================================================
-- Triggers for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON public.rm_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Helper Functions
-- ============================================================

-- Generate unique tracking code
CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Format: RET-YYYY-NNNNNN
        new_code := 'RET-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                    LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');

        -- Check if exists
        SELECT EXISTS(SELECT 1 FROM public.rm_requests WHERE code = new_code) INTO exists;

        EXIT WHEN NOT exists;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate code on insert
CREATE OR REPLACE FUNCTION auto_generate_request_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := generate_request_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_request_code
    BEFORE INSERT ON public.rm_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_request_code();

-- Auto-log events on status change
CREATE OR REPLACE FUNCTION log_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.rm_request_events (
            request_id,
            event_type,
            description,
            old_status,
            new_status,
            user_id,
            metadata
        ) VALUES (
            NEW.id,
            'status_changed',
            'Status alterado de ' || OLD.status || ' para ' || NEW.status,
            OLD.status,
            NEW.status,
            auth.uid(),
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'changed_at', NOW()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_request_status_change
    AFTER UPDATE ON public.rm_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_request_status_change();

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

ALTER TABLE public.rm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rm_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rm_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rm_shipping_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rm_refunds ENABLE ROW LEVEL SECURITY;

-- Requests Policies
CREATE POLICY "Users can view requests from their stores"
    ON public.rm_requests
    FOR SELECT
    USING (
        is_admin(auth.uid())
        OR public.user_has_store_access(auth.uid(), store_id)
    );

CREATE POLICY "Users can create requests for their stores"
    ON public.rm_requests
    FOR INSERT
    WITH CHECK (
        is_admin(auth.uid())
        OR public.user_has_store_access(auth.uid(), store_id)
    );

CREATE POLICY "Users can update requests from their stores"
    ON public.rm_requests
    FOR UPDATE
    USING (
        is_admin(auth.uid())
        OR public.user_has_store_access(auth.uid(), store_id)
    );

-- Request Items Policies
CREATE POLICY "Users can view request items from their stores"
    ON public.rm_request_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rm_requests r
            WHERE r.id = rm_request_items.request_id
            AND (is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), r.store_id))
        )
    );

CREATE POLICY "Users can manage request items from their stores"
    ON public.rm_request_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.rm_requests r
            WHERE r.id = rm_request_items.request_id
            AND (is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), r.store_id))
        )
    );

-- Request Events Policies
CREATE POLICY "Users can view events from their store requests"
    ON public.rm_request_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rm_requests r
            WHERE r.id = rm_request_events.request_id
            AND (is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), r.store_id))
        )
    );

CREATE POLICY "Users can create events for their store requests"
    ON public.rm_request_events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.rm_requests r
            WHERE r.id = rm_request_events.request_id
            AND (is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), r.store_id))
        )
    );

-- Shipping Labels Policies
CREATE POLICY "Users can view labels from their store requests"
    ON public.rm_shipping_labels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rm_requests r
            WHERE r.id = rm_shipping_labels.request_id
            AND (is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), r.store_id))
        )
    );

CREATE POLICY "Users can manage labels for their store requests"
    ON public.rm_shipping_labels
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.rm_requests r
            WHERE r.id = rm_shipping_labels.request_id
            AND (is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), r.store_id))
        )
    );

-- Refunds Policies
CREATE POLICY "Users can view refunds from their store requests"
    ON public.rm_refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rm_requests r
            WHERE r.id = rm_refunds.request_id
            AND (is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), r.store_id))
        )
    );

CREATE POLICY "Users can manage refunds for their store requests"
    ON public.rm_refunds
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.rm_requests r
            WHERE r.id = rm_refunds.request_id
            AND (is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), r.store_id))
        )
    );

-- ============================================================
-- Comments for Documentation
-- ============================================================

COMMENT ON TABLE public.rm_requests IS 'Return and exchange requests from customers';
COMMENT ON TABLE public.rm_request_items IS 'Items included in return/exchange requests';
COMMENT ON TABLE public.rm_request_events IS 'Audit trail of all events for requests';
COMMENT ON TABLE public.rm_shipping_labels IS 'Shipping labels for return shipments';
COMMENT ON TABLE public.rm_refunds IS 'Refund transactions for approved returns';

COMMENT ON COLUMN public.rm_requests.code IS 'Unique tracking code for customer (e.g., RET-2024-001234)';
COMMENT ON COLUMN public.rm_requests.tracking_code IS 'Carrier tracking code for return shipment';
COMMENT ON COLUMN public.rm_shipping_labels.provider_label_id IS 'ID from shipping label provider API (Correios, FedEx, etc.)';
