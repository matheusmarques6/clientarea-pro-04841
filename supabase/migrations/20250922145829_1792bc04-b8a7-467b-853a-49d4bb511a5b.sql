-- Create admin roles and extend existing structures
-- Add admin roles to existing role_type enum if it exists, otherwise create it
DO $$ 
BEGIN
    -- First try to add new values to existing enum
    BEGIN
        ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'admin';
        ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'super_admin'; 
        ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'support';
    EXCEPTION
        WHEN invalid_schema_name THEN
            -- If enum doesn't exist, create it
            CREATE TYPE role_type AS ENUM ('owner', 'manager', 'viewer', 'admin', 'super_admin', 'support');
    END;
END $$;

-- Create clients table (if not exists)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    legal_name TEXT,
    tax_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add client_id to stores table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'client_id') THEN
        ALTER TABLE public.stores ADD COLUMN client_id UUID REFERENCES public.clients(id);
    END IF;
END $$;

-- Add admin fields to existing users table or create if not exists
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role role_type DEFAULT 'viewer',
    twofa_secret TEXT,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add admin fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'twofa_secret') THEN
        ALTER TABLE public.users ADD COLUMN twofa_secret TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE public.users ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- Create user_store_roles table for RBAC
CREATE TABLE IF NOT EXISTS public.user_store_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    role role_type DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, store_id)
);

-- Create invites table
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role role_type DEFAULT 'viewer',
    token UUID UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_audit table
CREATE TABLE IF NOT EXISTS public.admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_sessions table for admin authentication
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_store_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admins can access all clients" ON public.clients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can access all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can access all user_store_roles" ON public.user_store_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can access all invites" ON public.invites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can access all admin_audit" ON public.admin_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can access admin_sessions" ON public.admin_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
        CREATE TRIGGER update_clients_updated_at
            BEFORE UPDATE ON public.clients
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON public.users
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Seed admin user
INSERT INTO public.users (
    id,
    name,
    email,
    password_hash,
    role,
    is_admin
) VALUES (
    'admin-seed-user-id-123456789',
    'Super Admin',
    'admin@convertfy.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password123
    'super_admin',
    true
) ON CONFLICT (email) DO UPDATE SET 
    is_admin = true,
    role = 'super_admin';

-- Seed demo client and data
INSERT INTO public.clients (
    id,
    name,
    legal_name,
    status
) VALUES (
    'demo-client-id-123456789',
    'Demo Client',
    'Demo Client Ltda',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Update existing stores to belong to demo client
UPDATE public.stores 
SET client_id = 'demo-client-id-123456789'
WHERE client_id IS NULL;

-- Create view for easy admin queries
CREATE OR REPLACE VIEW public.v_admin_users AS
SELECT 
    u.*,
    array_agg(
        DISTINCT jsonb_build_object(
            'store_id', usr.store_id,
            'store_name', s.name,
            'role', usr.role
        )
    ) FILTER (WHERE usr.store_id IS NOT NULL) as store_roles
FROM public.users u
LEFT JOIN public.user_store_roles usr ON u.id = usr.user_id
LEFT JOIN public.stores s ON usr.store_id = s.id
GROUP BY u.id;