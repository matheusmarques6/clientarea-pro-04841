-- Seed admin user (using proper UUID)
INSERT INTO public.users (
    id,
    name,
    email,
    password_hash,
    role,
    is_admin
) VALUES (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'Super Admin',
    'admin@convertfy.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password123
    'super_admin',
    true
) ON CONFLICT (email) DO UPDATE SET 
    is_admin = true,
    role = 'super_admin';

-- Seed demo client and data (using proper UUID)
INSERT INTO public.clients (
    id,
    name,
    legal_name,
    status
) VALUES (
    'b2c3d4e5-f6a7-8901-2345-678901bcdefg',
    'Demo Client',
    'Demo Client Ltda',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Update existing stores to belong to demo client
UPDATE public.stores 
SET client_id = 'b2c3d4e5-f6a7-8901-2345-678901bcdefg'
WHERE client_id IS NULL;