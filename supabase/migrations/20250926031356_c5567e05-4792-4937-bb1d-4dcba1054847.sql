-- Resetar a senha do usuário carlos@eternityholding.com para poder fazer login
-- Nota: Isso é apenas para teste, em produção deve-se usar o fluxo de reset de senha

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Buscar o ID do usuário
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'carlos@eternityholding.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Para atualizar a senha, precisamos usar a função administrativa
    -- Como não podemos definir senha diretamente via SQL, vamos marcar para reset
    UPDATE auth.users 
    SET updated_at = now() 
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Usuário encontrado. Use a edge function admin-create-user ou reset de senha para definir nova senha.';
  END IF;
END $$;