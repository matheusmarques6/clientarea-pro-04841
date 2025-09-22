-- First migration: Create enum extensions and base tables
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