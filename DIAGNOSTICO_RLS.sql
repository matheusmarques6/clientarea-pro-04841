-- ============================================================================
-- DIAGNÓSTICO DE RLS - Encontrar Policies Problemáticas
-- Execute este script no Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1) Verificar policies na tabela STORES (mais crítica)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'stores'
ORDER BY policyname;

-- 2) Verificar policies em klaviyo_summaries
SELECT
  'klaviyo_summaries' as table_name,
  policyname,
  permissive,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'klaviyo_summaries';

-- 3) Verificar policies em channel_revenue
SELECT
  'channel_revenue' as table_name,
  policyname,
  permissive,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'channel_revenue';

-- 4) Verificar policies em n8n_jobs
SELECT
  'n8n_jobs' as table_name,
  policyname,
  permissive,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'n8n_jobs';

-- 5) Verificar policies em store_sync_cache (nova tabela Level 2)
SELECT
  'store_sync_cache' as table_name,
  policyname,
  permissive,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'store_sync_cache';

-- 6) Verificar policies em sync_queue (nova tabela Level 2)
SELECT
  'sync_queue' as table_name,
  policyname,
  permissive,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'sync_queue';

-- ============================================================================
-- PROCURAR POLICIES PERIGOSAS
-- ============================================================================

-- 7) Policies que usam "true" diretamente (PERIGOSO!)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;

-- 8) Verificar se RLS está ativado nas tabelas principais
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'stores',
    'klaviyo_summaries',
    'channel_revenue',
    'n8n_jobs',
    'store_sync_cache',
    'sync_queue',
    'store_members',
    'v_user_stores'
  )
ORDER BY tablename;

-- ============================================================================
-- TESTAR ACESSO
-- ============================================================================

-- 9) Testar quantas stores o usuário atual consegue ver
-- (Se ver TODAS as stores do sistema, há um problema!)
SELECT
  COUNT(*) as stores_visiveis,
  COUNT(DISTINCT owner_id) as diferentes_owners
FROM stores;

-- Se o resultado for > 1 owner E você não é admin, HÁ UM PROBLEMA!

-- 10) Verificar se a função user_has_store_access está funcionando
SELECT
  id,
  name,
  owner_id,
  public.user_has_store_access(auth.uid(), id) as tenho_acesso
FROM stores
LIMIT 10;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
--
-- ✅ SEGURO: Você deve ver apenas as stores onde você é membro/owner
-- ❌ INSEGURO: Se você vê stores de outros usuários, há vazamento de dados!
--
-- ============================================================================
