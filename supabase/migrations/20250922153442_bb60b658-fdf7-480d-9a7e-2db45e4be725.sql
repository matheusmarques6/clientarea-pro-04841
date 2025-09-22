-- Create admin user directly in database with confirmed email (fixed)
begin;

-- First, let's check if user already exists and clean up if needed
delete from public.users where email = 'admin@convertfy.dev';

-- Insert into auth.users (Supabase managed table) - without ON CONFLICT
do $$
declare
  user_exists boolean;
  new_user_id uuid;
begin
  -- Check if user already exists
  select exists(select 1 from auth.users where email = 'admin@convertfy.dev') into user_exists;
  
  if not user_exists then
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users
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
      new_user_id,
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
    );
  end if;
end $$;

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
and not exists (select 1 from public.users pu where pu.id = au.id);

-- Make sure the user is marked as admin if already exists
update public.users 
set is_admin = true, role = 'admin'::role_type
where email = 'admin@convertfy.dev';

commit;