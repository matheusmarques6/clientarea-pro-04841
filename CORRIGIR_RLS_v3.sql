-- ============================================================================
-- CORREÇÃO DE RLS v3 - APENAS TABELAS EXISTENTES
-- Corrige RLS nas tabelas que já existem no banco
-- Execute ANTES da migração do Nível 2
-- ============================================================================

-- ============================================================================
-- 1) TABELA STORES - Garantir acesso apenas às stores do usuário
-- ============================================================================

-- Remover TODAS as policies existentes
DROP POLICY IF EXISTS "Users can view their stores" ON public.stores;
DROP POLICY IF EXISTS "Users can see their associated stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can see all stores" ON public.stores;
DROP POLICY IF EXISTS "dashboard" ON public.stores; -- Policy problemática!
DROP POLICY IF EXISTS "Users can view their own stores" ON public.stores;

-- Criar APENAS uma policy correta e segura para SELECT
CREATE POLICY "Users can view their own stores"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), id)
  );

-- Policy para UPDATE (credenciais, etc)
DROP POLICY IF EXISTS "Users can update store credentials" ON public.stores;
DROP POLICY IF EXISTS "Users can update their stores" ON public.stores;

CREATE POLICY "Users can update their stores"
  ON public.stores
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), id)
  )
  WITH CHECK (
    is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), id)
  );

-- Policy para INSERT
DROP POLICY IF EXISTS "Users can insert stores" ON public.stores;
DROP POLICY IF EXISTS "Users can create stores" ON public.stores;

CREATE POLICY "Users can create stores"
  ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy para DELETE
DROP POLICY IF EXISTS "Users can delete stores" ON public.stores;
DROP POLICY IF EXISTS "Users can delete their stores" ON public.stores;

CREATE POLICY "Users can delete their stores"
  ON public.stores
  FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), id)
  );

-- Garantir que RLS está ativo
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2) TABELA KLAVIYO_SUMMARIES
-- ============================================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "klaviyo_summaries_rw_policy" ON public.klaviyo_summaries;
DROP POLICY IF EXISTS "Users can view their klaviyo_summaries" ON public.klaviyo_summaries;
DROP POLICY IF EXISTS "Users can view klaviyo summaries of their stores" ON public.klaviyo_summaries;

-- Criar policy correta
CREATE POLICY "Users can view klaviyo summaries of their stores"
  ON public.klaviyo_summaries
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id)
  );

-- Service role precisa de acesso total (para Edge Functions)
DROP POLICY IF EXISTS "Service role has full access to klaviyo_summaries" ON public.klaviyo_summaries;

CREATE POLICY "Service role has full access to klaviyo_summaries"
  ON public.klaviyo_summaries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.klaviyo_summaries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3) TABELA CHANNEL_REVENUE
-- ============================================================================

DROP POLICY IF EXISTS "channel_revenue_rw_policy" ON public.channel_revenue;
DROP POLICY IF EXISTS "Users can view their channel_revenue" ON public.channel_revenue;
DROP POLICY IF EXISTS "Users can view channel revenue of their stores" ON public.channel_revenue;

CREATE POLICY "Users can view channel revenue of their stores"
  ON public.channel_revenue
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid()) OR public.user_has_store_access(auth.uid(), store_id)
  );

DROP POLICY IF EXISTS "Service role has full access to channel_revenue" ON public.channel_revenue;

CREATE POLICY "Service role has full access to channel_revenue"
  ON public.channel_revenue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.channel_revenue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4) TABELA N8N_JOBS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their store jobs" ON public.n8n_jobs;
DROP POLICY IF EXISTS "Users can insert jobs for their stores" ON public.n8n_jobs;
DROP POLICY IF EXISTS "Users can view jobs of their stores" ON public.n8n_jobs;
DROP POLICY IF EXISTS "Users can create jobs for their stores" ON public.n8n_jobs;

CREATE POLICY "Users can view jobs of their stores"
  ON public.n8n_jobs
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.user_has_store_access(auth.uid(), store_id)
  );

CREATE POLICY "Users can create jobs for their stores"
  ON public.n8n_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR public.user_has_store_access(auth.uid(), store_id)
  );

DROP POLICY IF EXISTS "Service role has full access to n8n_jobs" ON public.n8n_jobs;

CREATE POLICY "Service role has full access to n8n_jobs"
  ON public.n8n_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.n8n_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar todas as policies nas tabelas corrigidas
SELECT
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('stores', 'klaviyo_summaries', 'channel_revenue', 'n8n_jobs')
ORDER BY tablename, policyname;

-- ============================================================================
-- ✅ TESTE FINAL
-- ============================================================================

-- Contar quantas stores você consegue ver
SELECT
  COUNT(*) as stores_que_vejo,
  COUNT(DISTINCT id) as stores_distintas
FROM stores;

-- Se você vê mais stores do que deveria, AINDA HÁ PROBLEMA!

-- ============================================================================
-- PRÓXIMOS PASSOS
-- ============================================================================
--
-- 1. ✅ Execute este script
-- 2. ✅ Verifique se você vê apenas SUA(s) store(s)
-- 3. ✅ Depois execute a migração do Nível 2:
--    NIVEL_2_INSTALACAO.md > Passo 1 (migração sync_queue)
--
-- A migração do Nível 2 JÁ cria as policies corretas para:
-- - sync_queue
-- - store_sync_cache
--
-- ============================================================================
