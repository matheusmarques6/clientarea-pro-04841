-- Trigger para associar automaticamente usuários de um cliente a novas lojas do mesmo cliente
CREATE OR REPLACE FUNCTION public.auto_associate_client_users_to_store()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma nova loja é criada, associa automaticamente todos os usuários do cliente
  INSERT INTO public.store_members (user_id, store_id, role)
  SELECT DISTINCT 
    sm_existing.user_id,
    NEW.id,
    COALESCE(sm_existing.role, 'viewer')
  FROM public.store_members sm_existing
  JOIN public.stores s_existing ON s_existing.id = sm_existing.store_id
  WHERE s_existing.client_id = NEW.client_id
  ON CONFLICT (user_id, store_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para executar após inserção de nova loja
DROP TRIGGER IF EXISTS trg_auto_associate_users_to_new_store ON public.stores;
CREATE TRIGGER trg_auto_associate_users_to_new_store
  AFTER INSERT ON public.stores
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_associate_client_users_to_store();

-- Função para associar automaticamente usuário a todas as lojas do cliente quando ele é adicionado a uma loja
CREATE OR REPLACE FUNCTION public.auto_associate_user_to_client_stores()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um usuário é associado a uma loja, associa automaticamente a todas as outras lojas do mesmo cliente
  INSERT INTO public.store_members (user_id, store_id, role)
  SELECT DISTINCT 
    NEW.user_id,
    s.id,
    NEW.role
  FROM public.stores s
  JOIN public.stores s_ref ON s_ref.id = NEW.store_id
  WHERE s.client_id = s_ref.client_id
    AND s.id != NEW.store_id
  ON CONFLICT (user_id, store_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para executar após inserção de novo membro em loja
DROP TRIGGER IF EXISTS trg_auto_associate_user_to_client_stores ON public.store_members;
CREATE TRIGGER trg_auto_associate_user_to_client_stores
  AFTER INSERT ON public.store_members
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_associate_user_to_client_stores();