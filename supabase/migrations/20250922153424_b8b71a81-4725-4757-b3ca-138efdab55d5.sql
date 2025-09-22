-- Create admin user directly in database with confirmed email
begin;

-- Insert into auth.users (Supabase managed table)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@convertfy.dev',
  crypt('password123', gen_salt('bf')),
  now(),
  null,
  null,
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) on conflict (email) do nothing;

-- Get the user ID for the profile creation
-- Insert into public.users with admin privileges
insert into public.users (
  id,
  email,
  name,
  is_admin,
  role,
  created_at,
  updated_at
)
select 
  au.id,
  'admin@convertfy.dev',
  'Administrador',
  true,
  'admin'::role_type,
  now(),
  now()
from auth.users au 
where au.email = 'admin@convertfy.dev'
on conflict (id) do update set
  is_admin = true,
  role = 'admin'::role_type;

commit;