-- Fix security issues: Enable RLS on all tables that need it
-- Enable RLS on clients and users tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Se o email for demo@convertfy.com, associar às lojas de demo
  IF NEW.email = 'demo@convertfy.com' THEN
    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES 
      ('550e8400-e29b-41d4-a716-446655440001', NEW.id, 'owner'),
      ('550e8400-e29b-41d4-a716-446655440002', NEW.id, 'owner'),
      ('550e8400-e29b-41d4-a716-446655440003', NEW.id, 'owner')
    ON CONFLICT (store_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create basic RLS policies for clients table
CREATE POLICY "Allow admin access to clients" ON public.clients 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Create basic RLS policies for users table
CREATE POLICY "Users can view their own profile" ON public.users 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON public.users 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can insert users" ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update users" ON public.users 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Seed admin user with new UUID format
INSERT INTO public.users (
    name,
    email,
    password_hash,
    role,
    is_admin
) VALUES (
    'Super Admin',
    'admin@convertfy.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'super_admin',
    true
) ON CONFLICT (email) DO UPDATE SET 
    is_admin = true,
    role = 'super_admin',
    password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';