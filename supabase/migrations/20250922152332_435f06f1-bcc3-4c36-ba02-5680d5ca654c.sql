-- Verificar se o usuário admin existe e criar se necessário
INSERT INTO users (
  id,
  email,
  name,
  is_admin,
  role,
  password_hash,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@convertfy.dev',
  'Super Admin',
  true,
  'super_admin',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Mock hash for demo
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  is_admin = true,
  role = 'super_admin',
  updated_at = now();

-- Garantir que também existe um registro demo para testes
INSERT INTO users (
  id,
  email,
  name,
  is_admin,
  role,
  password_hash,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'demo@convertfy.com',
  'Demo User',
  false,
  'owner',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  role = 'owner',
  updated_at = now();