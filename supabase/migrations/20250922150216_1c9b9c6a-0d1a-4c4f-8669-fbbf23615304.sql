-- Seed admin user (using gen_random_uuid)
INSERT INTO public.users (
    name,
    email,
    password_hash,
    role,
    is_admin
) VALUES (
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
    name,
    legal_name,
    status
) VALUES (
    'Demo Client',
    'Demo Client Ltda',
    'active'
) ON CONFLICT DO NOTHING;

-- Update existing stores to belong to demo client
UPDATE public.stores 
SET client_id = (SELECT id FROM public.clients WHERE name = 'Demo Client' LIMIT 1)
WHERE client_id IS NULL;