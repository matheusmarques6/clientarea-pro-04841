-- Associar o usuário acesso@oakvintage.com.br à loja Oak Vintage
INSERT INTO public.store_members (user_id, store_id, role)
SELECT 
  u.id,
  s.id,
  'owner'
FROM public.users u, public.stores s
WHERE u.email = 'acesso@oakvintage.com.br' 
  AND s.name = 'Oak Vintage'
ON CONFLICT (user_id, store_id) DO NOTHING;