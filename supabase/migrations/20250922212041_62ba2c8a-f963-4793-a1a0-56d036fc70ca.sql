-- Confirm email for user acesso@oakvintage.com.br using admin privileges
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  confirmed_at = now(),
  raw_user_meta_data = raw_user_meta_data || '{"email_verified": true}'::jsonb
WHERE email = 'acesso@oakvintage.com.br';