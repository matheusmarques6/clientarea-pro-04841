-- ============================================================================
-- CORREÇÃO DE RLS v2 - Versão corrigida (sem owner_id)
-- ⚠️ IMPORTANTE: Execute o DIAGNOSTICO_RLS.sql PRIMEIRO para identificar
-- o problema antes de executar esta correção!
-- ============================================================================

-- ============================================================================
-- 1) TABELA STORES - Garantir acesso apenas às stores do usuário
-- ============================================================================

-- Remover TODAS as policies existentes
DROP POLICY IF EXISTS "Users can view their stores" ON public.stores;
DROP POLICY IF EXISTS "Users can see their associated stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can see all stores" ON public.stores;
DROP POLICY IF EXISTS "dashboard" ON public.stores; -- Policy problemática mencionada!
DROP POLICY IF EXISTS "Users can view their own stores" ON public.stores;

-- Criar APENAS uma policy correta e segura
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

-- Policy para INSERT (usuários autenticados podem criar stores)
DROP POLICY IF EXISTS "Users can insert stores" ON public.stores;
DROP POLICY IF EXISTS "Users can create stores" ON public.stores;

CREATE POLICY "Users can create stores"
  ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Qualquer usuário autenticado pode criar uma store

-- Policy para DELETE (apenas admins ou se tem acesso)
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
-- 2) TABELA KLAVIYO_SUMMARIES - Acesso apenas às lojas do usuário
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
-- 3) TABELA CHANNEL_REVENUE - Acesso apenas às lojas do usuário
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
-- 4) TABELA N8N_JOBS - Acesso apenas aos jobs das lojas do usuário
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
-- 5) TABELA SYNC_QUEUE (Level 2) - Acesso apenas às lojas do usuário
-- ============================================================================

-- Estas policies já foram criadas corretamente pela migração Level 2,
-- mas vamos garantir que estão corretas

DROP POLICY IF EXISTS "Users can view queue jobs for their stores" ON public.sync_queue;
DROP POLICY IF EXISTS "Users can insert queue jobs for their stores" ON public.sync_queue;
DROP POLICY IF EXISTS "Users can update queue jobs for their stores" ON public.sync_queue;

CREATE POLICY "Users can view queue jobs for their stores"
  ON public.sync_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_members.store_id = sync_queue.store_id
        AND store_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert queue jobs for their stores"
  ON public.sync_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_members.store_id = sync_queue.store_id
        AND store_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update queue jobs for their stores"
  ON public.sync_queue
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_members.store_id = sync_queue.store_id
        AND store_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role has full access to sync_queue" ON public.sync_queue;

CREATE POLICY "Service role has full access to sync_queue"
  ON public.sync_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6) TABELA STORE_SYNC_CACHE (Level 2) - Acesso apenas às lojas do usuário
-- ============================================================================

DROP POLICY IF EXISTS "Users can view cache of their stores" ON public.store_sync_cache;

CREATE POLICY "Users can view cache of their stores"
  ON public.store_sync_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_members.store_id = store_sync_cache.store_id
        AND store_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role has full access to store_sync_cache" ON public.store_sync_cache;

CREATE POLICY "Service role has full access to store_sync_cache"
  ON public.store_sync_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.store_sync_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar todas as policies nas tabelas críticas
SELECT
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('stores', 'klaviyo_summaries', 'channel_revenue', 'n8n_jobs', 'sync_queue', 'store_sync_cache')
ORDER BY tablename, policyname;

-- ============================================================================
-- ✅ CHECKLIST FINAL
-- ============================================================================
--
-- Após executar este script, verifique:
--
-- [ ] Usuários NÃO conseguem ver stores de outros usuários
-- [ ] Usuários NÃO conseguem ver dados klaviyo_summaries de outras stores
-- [ ] Usuários NÃO conseguem ver jobs de outras stores
-- [ ] Usuários NÃO conseguem ver fila/cache de outras stores
-- [ ] Service role (Edge Functions) CONSEGUE acessar tudo
-- [ ] Admins CONSEGUEM ver tudo
--
-- ============================================================================
