# 📋 Sprint 4: Otimizações Finais - Plano de Execução

**Objetivo:** Otimizar queries do banco de dados e adicionar configurações dinâmicas
**Tempo Estimado:** 6 horas
**Prioridade:** 🟡 Importante (após validar Sprints 1+2)

---

## 🎯 OBJETIVOS

1. **Eliminar N+1 Queries** no dashboard e hooks
2. **Adicionar Índices Otimizados** para queries lentas
3. **Implementar Timezone Dinâmico** por loja
4. **Auto-detectar Klaviyo Metric ID** por loja
5. **Criar Views Materializadas** para aggregações

---

## 📊 ESTADO ATUAL (Problemas Identificados)

### Problema 1: N+1 Queries no Dashboard

**Arquivo:** `src/hooks/useDashboardData.ts`

**Comportamento Atual:**
```typescript
// 1. Buscar stores
const stores = await supabase.from('stores').select('*')

// 2. Para cada store, buscar klaviyo_summaries (N+1!)
for (const store of stores) {
  const summary = await supabase
    .from('klaviyo_summaries')
    .eq('store_id', store.id)
    .single()
}
// Total: 1 + N queries = 11 queries para 10 stores
```

**Impacto:** Dashboard leva 3-5 segundos para carregar

**Meta:** < 1 segundo

---

### Problema 2: Timezone Hardcoded

**Arquivo:** `supabase/functions/_shared/shopify.ts:168`

```typescript
timezoneOffset: string = '-03:00'  // ❌ Hardcoded Brazil timezone
```

**Impacto:**
- Lojas internacionais têm datas/vendas incorretas
- Relatórios de período mostram dados do dia errado

**Exemplos:**
- Loja no horário EST (UTC-5) com servidor em UTC-3 = 2 horas de diferença
- Vendas de "ontem" podem incluir hoje ou vice-versa

---

### Problema 3: Klaviyo Metric Hardcoded

**Arquivo:** `supabase/functions/_shared/klaviyo.ts:196`

```typescript
if (!metricaId) {
  metricaId = 'W8Gk3c' // ❌ Metric ID específico de uma conta
}
```

**Impacto:**
- Contas Klaviyo diferentes podem ter metric IDs diferentes
- Sync retorna $0 de receita se métrica não existir
- Admin precisa descobrir metric ID manualmente

---

### Problema 4: Queries Lentas sem Índices

**Queries Identificadas:**

```sql
-- Query 1: Dashboard data (executada a cada load)
SELECT * FROM klaviyo_summaries
WHERE store_id = ?
AND period_start = ?
AND period_end = ?;
-- Sem índice! Full table scan

-- Query 2: Channel revenue
SELECT * FROM channel_revenue
WHERE store_id = ?
AND channel = 'shopify'
ORDER BY period_start DESC;
-- Sem índice em (store_id, channel)

-- Query 3: Sync queue
SELECT * FROM sync_queue
WHERE status = 'queued'
ORDER BY priority DESC, queued_at ASC;
-- Sem índice em status
```

---

## 🛠️ SOLUÇÕES (Sprint 4 Tasks)

### Task 4.1: Criar Índices Otimizados (1h)

**Arquivo:** `supabase/migrations/20250119100000_optimize_indexes.sql`

```sql
-- Índice composto para klaviyo_summaries (lookup mais comum)
CREATE INDEX CONCURRENTLY idx_klaviyo_summaries_store_period
ON klaviyo_summaries(store_id, period_start DESC, period_end DESC);

-- Índice para channel_revenue
CREATE INDEX CONCURRENTLY idx_channel_revenue_store_channel
ON channel_revenue(store_id, channel);

-- Índice parcial para sync_queue (apenas jobs ativos)
CREATE INDEX CONCURRENTLY idx_sync_queue_active
ON sync_queue(status, priority DESC, queued_at ASC)
WHERE status IN ('queued', 'processing');

-- Índice para store_members (RLS queries)
CREATE INDEX CONCURRENTLY idx_store_members_user_store
ON store_members(user_id, store_id);

-- Verificar uso de índices
ANALYZE klaviyo_summaries;
ANALYZE channel_revenue;
ANALYZE sync_queue;
ANALYZE store_members;
```

**Validação:**
```sql
-- Explicar query ANTES do índice
EXPLAIN ANALYZE
SELECT * FROM klaviyo_summaries
WHERE store_id = 'uuid-here'
AND period_start = '2025-01-01';
-- Deve mostrar: Seq Scan (BAD)

-- Criar índice...

-- Explicar query DEPOIS do índice
EXPLAIN ANALYZE
SELECT * FROM klaviyo_summaries
WHERE store_id = 'uuid-here'
AND period_start = '2025-01-01';
-- Deve mostrar: Index Scan using idx_klaviyo_summaries_store_period (GOOD)
```

---

### Task 4.2: Criar View Otimizada para Dashboard (1h)

**Arquivo:** `supabase/migrations/20250119100000_optimize_indexes.sql`

```sql
-- View que combina stores + latest summary + channel revenue
CREATE OR REPLACE VIEW v_dashboard_data AS
SELECT
  s.id AS store_id,
  s.name AS store_name,
  s.domain,
  s.status,
  s.currency,
  s.timezone_offset,

  -- Latest Klaviyo summary (usando DISTINCT ON)
  k.period_start,
  k.period_end,
  k.revenue_total,
  k.revenue_campaigns,
  k.revenue_flows,
  k.orders_attributed,
  k.conversions_campaigns,
  k.conversions_flows,
  k.leads_total,
  k.campaign_count,
  k.flow_count,

  -- Shopify revenue from channel_revenue
  ch.revenue AS shopify_revenue,
  ch.orders_count AS shopify_orders

FROM stores s

LEFT JOIN LATERAL (
  SELECT *
  FROM klaviyo_summaries
  WHERE store_id = s.id
  ORDER BY period_start DESC
  LIMIT 1
) k ON true

LEFT JOIN LATERAL (
  SELECT revenue, orders_count
  FROM channel_revenue
  WHERE store_id = s.id
    AND channel = 'shopify'
  ORDER BY period_start DESC
  LIMIT 1
) ch ON true;

-- Criar índice na view (materializada)
CREATE MATERIALIZED VIEW v_dashboard_data_cached AS
SELECT * FROM v_dashboard_data;

CREATE UNIQUE INDEX idx_dashboard_cache_store
ON v_dashboard_data_cached(store_id);

-- Função para refresh automático
CREATE OR REPLACE FUNCTION refresh_dashboard_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_dashboard_data_cached;
END;
$$;

-- Trigger para auto-refresh quando klaviyo_summaries atualizar
CREATE OR REPLACE FUNCTION trigger_refresh_dashboard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_dashboard_cache();
  RETURN NEW;
END;
$$;

CREATE TRIGGER refresh_dashboard_on_summary_update
AFTER INSERT OR UPDATE ON klaviyo_summaries
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_dashboard();
```

**Uso no Frontend:**
```typescript
// ANTES (N+1 queries)
const stores = await supabase.from('stores').select('*')
for (const store of stores) {
  const summary = await supabase.from('klaviyo_summaries')...
}

// DEPOIS (1 query)
const { data } = await supabase
  .from('v_dashboard_data_cached')
  .select('*')
  .eq('store_id', storeId)
  .single()
```

---

### Task 4.3: Adicionar Timezone Dinâmico (1h30)

**Subtask 4.3.1: Migration para Adicionar Coluna**

```sql
-- Adicionar timezone_offset à tabela stores
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS timezone_offset TEXT DEFAULT '-03:00';

COMMENT ON COLUMN stores.timezone_offset IS
  'Store timezone offset in format +HH:MM or -HH:MM (e.g., -03:00 for Brazil, +05:30 for India)';

-- Atualizar lojas existentes com timezone correto
-- (necessário buscar do Shopify ou configurar manualmente)
UPDATE stores
SET timezone_offset = '-03:00'
WHERE country = 'BR';

UPDATE stores
SET timezone_offset = '-05:00'
WHERE country = 'US';
-- ... outros países
```

**Subtask 4.3.2: Atualizar Função Shopify**

**Arquivo:** `supabase/functions/_shared/shopify.ts`

```typescript
// ANTES
export async function fetchShopifyData(
  domain: string,
  token: string,
  startDate: string,
  endDate: string,
  timezoneOffset: string = '-03:00'  // ❌ Default hardcoded
): Promise<ShopifySummary>

// DEPOIS
export async function fetchShopifyData(
  domain: string,
  token: string,
  startDate: string,
  endDate: string,
  timezoneOffset: string  // ✅ Obrigatório, sem default
): Promise<ShopifySummary>
```

**Subtask 4.3.3: Atualizar sync-store para Passar Timezone**

**Arquivo:** `supabase/functions/sync-store/index.ts`

```typescript
// Buscar store completo
const { data: store } = await supabase
  .from('stores')
  .select('*')
  .eq('id', store_id)
  .single()

// Passar timezone da loja
const shopifyData = await fetchShopifyData(
  store.shopify_domain,
  store.shopify_access_token,
  period_start,
  period_end,
  store.timezone_offset || '-03:00'  // Fallback para Brasil
)
```

**Subtask 4.3.4: UI para Configurar Timezone**

**Arquivo:** `src/components/StoreSettings.tsx` (criar se não existir)

```typescript
const timezones = [
  { value: '-12:00', label: 'UTC-12 (Baker Island)' },
  { value: '-11:00', label: 'UTC-11 (American Samoa)' },
  { value: '-10:00', label: 'UTC-10 (Hawaii)' },
  { value: '-08:00', label: 'UTC-8 (PST)' },
  { value: '-05:00', label: 'UTC-5 (EST)' },
  { value: '-03:00', label: 'UTC-3 (Brazil)' },
  { value: '+00:00', label: 'UTC (London)' },
  { value: '+01:00', label: 'UTC+1 (Paris)' },
  { value: '+05:30', label: 'UTC+5:30 (India)' },
  { value: '+08:00', label: 'UTC+8 (Singapore)' },
  // ... mais timezones
]

// Select component
<Select
  value={store.timezone_offset}
  onChange={(tz) => updateStore({ timezone_offset: tz })}
>
  {timezones.map(tz => (
    <option key={tz.value} value={tz.value}>{tz.label}</option>
  ))}
</Select>
```

---

### Task 4.4: Auto-detectar Klaviyo Metric ID (2h)

**Subtask 4.4.1: Adicionar Coluna**

```sql
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS klaviyo_metric_id TEXT;

COMMENT ON COLUMN stores.klaviyo_metric_id IS
  'Klaviyo Placed Order metric ID for this account';

CREATE INDEX idx_stores_klaviyo_metric
ON stores(id)
WHERE klaviyo_metric_id IS NOT NULL;
```

**Subtask 4.4.2: Criar Edge Function de Detecção**

**Arquivo:** `supabase/functions/admin-detect-klaviyo-metrics/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('detect-klaviyo-metrics')

serve(async (req) => {
  // Admin only
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Verificar se é admin
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)

  const { data: userRecord } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user!.id)
    .single()

  if (!userRecord?.is_admin) {
    return new Response('Forbidden', { status: 403 })
  }

  // Buscar todas stores com Klaviyo key mas sem metric_id
  const { data: stores } = await supabase
    .from('stores')
    .select('id, klaviyo_private_key_encrypted, klaviyo_metric_id')
    .not('klaviyo_private_key_encrypted', 'is', null)
    .is('klaviyo_metric_id', null)

  const results = []

  for (const store of stores || []) {
    try {
      // Descriptografar key
      const klaviyoKey = await decrypt(store.klaviyo_private_key_encrypted)

      // Buscar metrics da API Klaviyo
      const res = await fetch('https://a.klaviyo.com/api/metrics', {
        headers: {
          'Authorization': `Klaviyo-API-Key ${klaviyoKey}`,
          'revision': '2024-10-15'
        }
      })

      if (!res.ok) {
        throw new Error(`Klaviyo API error: ${res.status}`)
      }

      const data = await res.json()
      const placedOrders = data.data.filter(
        (m: any) => m.attributes.name === 'Placed Order'
      )

      if (placedOrders.length === 1) {
        const metricId = placedOrders[0].id

        // Salvar no banco
        await supabase
          .from('stores')
          .update({ klaviyo_metric_id: metricId })
          .eq('id', store.id)

        results.push({
          store_id: store.id,
          status: 'success',
          metric_id: metricId
        })

        logger.info('Metric detected', { store_id: store.id, metric_id: metricId })
      } else if (placedOrders.length > 1) {
        results.push({
          store_id: store.id,
          status: 'multiple_metrics',
          count: placedOrders.length
        })
      } else {
        results.push({
          store_id: store.id,
          status: 'not_found'
        })
      }
    } catch (error: any) {
      results.push({
        store_id: store.id,
        status: 'error',
        error: error.message
      })
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Subtask 4.4.3: Atualizar fetchKlaviyoData**

**Arquivo:** `supabase/functions/_shared/klaviyo.ts`

```typescript
// ANTES
if (!metricaId) {
  metricaId = 'W8Gk3c' // ❌ Hardcoded fallback
}

// DEPOIS
if (!metricaId) {
  throw new Error(
    'Metric "Placed Order" not found. ' +
    'Run admin-detect-klaviyo-metrics function to auto-detect.'
  )
}
```

**Subtask 4.4.4: Atualizar sync-store**

```typescript
// Buscar metric_id da store
const { data: store } = await supabase
  .from('stores')
  .select('klaviyo_metric_id')
  .eq('id', store_id)
  .single()

// Passar para fetchKlaviyoData
const klaviyoData = await fetchKlaviyoData(
  klaviyoKey,
  period_start,
  period_end,
  store.klaviyo_metric_id  // ✅ Usar metric ID da store
)
```

---

### Task 4.5: Atualizar Hooks Frontend (30min)

**Arquivo:** `src/hooks/useDashboardData.ts`

```typescript
// ANTES
const { data: stores } = await supabase.from('stores').select('*')
for (const store of stores) {
  const summary = await supabase.from('klaviyo_summaries')...
}

// DEPOIS
const { data } = await supabase
  .from('v_dashboard_data_cached')
  .select('*')

// Ou com JOIN direto
const { data } = await supabase
  .from('stores')
  .select(`
    *,
    klaviyo_summaries (
      revenue_total,
      orders_attributed,
      ...
    ),
    channel_revenue!inner (
      revenue,
      orders_count
    )
  `)
  .eq('channel_revenue.channel', 'shopify')
  .order('klaviyo_summaries.period_start', { ascending: false })
  .limit(1, { foreignTable: 'klaviyo_summaries' })
```

---

## 📊 MÉTRICAS DE SUCESSO

### Performance

| Métrica | Antes | Meta | Como Medir |
|---------|-------|------|------------|
| Dashboard load time | 3-5s | < 1s | Chrome DevTools Network |
| Database queries | 11 | 1-2 | Supabase Logs |
| Query latency (avg) | 200ms | < 50ms | EXPLAIN ANALYZE |
| Index hit rate | 60% | > 95% | pg_stat_user_indexes |

### Funcionalidade

- [ ] Timezone correto para lojas internacionais
- [ ] Klaviyo metric auto-detectado (>90% das contas)
- [ ] Dashboard usa view otimizada
- [ ] Índices aplicados em produção
- [ ] Zero erros de timezone em relatórios

---

## 🧪 PLANO DE TESTES

### Teste 1: Performance do Dashboard

```bash
# ANTES da otimização
time curl -H "Authorization: Bearer $TOKEN" \
  https://app.convertfy.com/api/dashboard

# Deve retornar em 3-5 segundos

# DEPOIS da otimização
time curl -H "Authorization: Bearer $TOKEN" \
  https://app.convertfy.com/api/dashboard

# Deve retornar em < 1 segundo
```

### Teste 2: Timezone Correto

```sql
-- Criar loja com timezone diferente
INSERT INTO stores (id, name, domain, timezone_offset)
VALUES (gen_random_uuid(), 'Test Store USA', 'test-usa.myshopify.com', '-05:00');

-- Executar sync

-- Verificar que as vendas do dia estão corretas
SELECT period_start, period_end, shopify_total_sales
FROM klaviyo_summaries
WHERE store_id = (SELECT id FROM stores WHERE name = 'Test Store USA')
ORDER BY period_start DESC
LIMIT 1;

-- As vendas devem estar no dia correto considerando EST (UTC-5)
```

### Teste 3: Metric Auto-detection

```bash
# Executar função de detecção
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://PROJECT.supabase.co/functions/v1/admin-detect-klaviyo-metrics

# Verificar resultado
SELECT id, name, klaviyo_metric_id
FROM stores
WHERE klaviyo_metric_id IS NOT NULL;

# Deve mostrar metric IDs para a maioria das stores
```

---

## 📦 ENTREGÁVEIS

- [ ] Migration SQL com índices otimizados
- [ ] View `v_dashboard_data` criada
- [ ] Materialized view `v_dashboard_data_cached`
- [ ] Trigger automático de refresh
- [ ] Timezone configurável por loja
- [ ] UI para selecionar timezone
- [ ] Klaviyo metric auto-detect function
- [ ] Hooks frontend atualizados
- [ ] Testes de performance documentados
- [ ] Documentação atualizada

---

## 🚀 ORDEM DE EXECUÇÃO

1. **Criar migration de índices** (criar arquivo SQL)
2. **Aplicar migration em staging** (testar performance)
3. **Criar views otimizadas** (dashboard data)
4. **Adicionar timezone column** (migration)
5. **Atualizar sync-store** (passar timezone)
6. **Criar UI de timezone** (frontend)
7. **Adicionar metric_id column** (migration)
8. **Criar detect-metrics function** (Edge Function)
9. **Executar detecção** (admin action)
10. **Atualizar hooks frontend** (usar views)
11. **Testar performance** (validar metas)
12. **Deploy em produção** (gradual rollout)

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Índices causam lentidão em writes | Baixa | Médio | Usar CONCURRENTLY, monitorar |
| Materialized view desatualizada | Média | Baixo | Trigger automático de refresh |
| Timezone incorreto quebra relatórios | Alta | Alto | Testar extensivamente em staging |
| Metric detection falha | Média | Médio | Fallback manual via UI |

---

**Próxima Sessão:** Começar pela Task 4.1 (Criar Índices)
**Tempo Estimado:** 6 horas
**Pronto para Executar:** ✅ Sim (após validar Sprints 1+2)
