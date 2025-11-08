# 📋 NÍVEL 2 - Sistema de Fila: Guia de Instalação

## ✅ O que foi implementado

O **Nível 2** implementa um sistema de fila com cache para sincronização de dados Klaviyo/Shopify, resolvendo os problemas de:
- ✅ Timeout de Edge Functions (150s)
- ✅ Erros 403 por sobrecarga
- ✅ Sincronizações desnecessárias (agora usa cache)
- ✅ Controle de concorrência (máx 3 jobs simultâneos)
- ✅ Retry automático (3 tentativas)

### Arquivos criados/modificados:

**Backend (Supabase):**
1. ✅ `/supabase/migrations/20251104100000_create_sync_queue.sql` - Migração com tabelas `sync_queue` e `store_sync_cache`
2. ✅ `/supabase/functions/sync-worker/index.ts` - Worker que processa a fila
3. ✅ `/supabase/functions/sync-store/index.ts` - Atualizado para salvar dados no cache

**Frontend:**
4. ✅ `/src/services/QueueService.ts` - Serviço para interagir com a fila
5. ✅ `/src/hooks/useDashboardData.ts` - Atualizado para usar sistema de fila
6. ✅ `/src/components/QueueStatus.tsx` - Componente para mostrar status da fila

---

## 🚀 PASSOS PARA ATIVAR

### 1️⃣ Executar Migração SQL no Banco

**⚠️ IMPORTANTE:** Você precisa executar a migração SQL manualmente no Supabase.

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Abra o arquivo local `/supabase/migrations/20251104100000_create_sync_queue.sql`
5. Copie TODO o conteúdo do arquivo
6. Cole no SQL Editor
7. Clique em **"Run"** (executar)

✅ **Verificar se deu certo:**
```sql
-- Execute no SQL Editor para verificar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('sync_queue', 'store_sync_cache');
```

Deve retornar 2 linhas (as duas tabelas).

---

### 2️⃣ Fazer Deploy das Edge Functions

Você precisa fazer deploy de 2 Edge Functions:

#### A) Deploy do sync-worker

```bash
# Na raiz do projeto
supabase functions deploy sync-worker
```

✅ **Verificar se deu certo:**
```bash
supabase functions list
```

Deve aparecer `sync-worker` na lista.

#### B) Deploy do sync-store (atualizado)

```bash
supabase functions deploy sync-store
```

---

### 3️⃣ Configurar Cron Job (Worker)

O `sync-worker` precisa ser executado automaticamente a cada 10 segundos para processar a fila.

**Opção A: Usando Supabase Cron (Recomendado - Requer plano Pro)**

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Database** → **Extensions**
3. Ative a extensão `pg_cron`
4. Vá em **SQL Editor** e execute:

```sql
-- Criar cron job que executa a cada 10 segundos
SELECT cron.schedule(
  'sync-worker-every-10s',           -- Nome do job
  '*/10 * * * * *',                  -- A cada 10 segundos (formato: segundo minuto hora dia mês dia-da-semana)
  $$
  SELECT
    net.http_post(
      url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/sync-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SEU_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**⚠️ IMPORTANTE:** Substitua:
- `SEU_PROJECT_ID` pelo ID do seu projeto Supabase
- `SEU_ANON_KEY` pela sua Anon Key (encontre em Settings → API)

**Opção B: Usando serviço externo (Cron-Job.org - GRÁTIS)**

Se você não tem o plano Pro do Supabase, use um serviço externo:

1. Acesse [cron-job.org](https://cron-job.org)
2. Crie uma conta gratuita
3. Crie um novo Cron Job:
   - **URL**: `https://SEU_PROJECT_ID.supabase.co/functions/v1/sync-worker`
   - **Intervalo**: A cada 10 segundos (se permitido) ou 1 minuto
   - **Método**: POST
   - **Headers**: Adicione
     - `Content-Type: application/json`
     - `Authorization: Bearer SEU_ANON_KEY`

**Opção C: Usando GitHub Actions (se o projeto está no GitHub)**

Crie o arquivo `.github/workflows/sync-worker.yml`:

```yaml
name: Sync Worker
on:
  schedule:
    - cron: '*/1 * * * *' # A cada 1 minuto (GitHub não suporta menos que isso)
  workflow_dispatch: # Permite executar manualmente

jobs:
  invoke-worker:
    runs-on: ubuntu-latest
    steps:
      - name: Invoke sync-worker
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://SEU_PROJECT_ID.supabase.co/functions/v1/sync-worker
```

Adicione `SUPABASE_ANON_KEY` nos secrets do repositório.

---

### 4️⃣ Testar Localmente (Desenvolvimento)

#### Executar migração local:

```bash
# Reset local database e aplicar todas as migrações
supabase db reset
```

#### Executar Edge Functions localmente:

```bash
# Terminal 1: Supabase local
supabase start

# Terminal 2: Edge Functions (auto-reload)
supabase functions serve
```

#### Testar o worker manualmente:

```bash
# Invocar o worker localmente
curl -X POST http://localhost:54321/functions/v1/sync-worker \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(supabase status | grep 'anon key' | awk '{print $3}')"
```

#### Testar a fila no frontend:

1. Inicie o dev server: `npm run dev`
2. Abra o dashboard de uma loja
3. Clique em "Sincronizar"
4. Verifique os logs do console para ver:
   - Job sendo adicionado à fila
   - Polling do status do job
   - Conclusão da sincronização

---

## 📊 Como Funciona

### Fluxo Completo:

```
1. Usuário clica "Sincronizar" no dashboard
   ↓
2. Frontend verifica CACHE primeiro (QueueService.checkCache)
   ↓
   SE cache existe → Carrega dados instantaneamente ✅
   SE não existe → Continua para step 3
   ↓
3. Frontend adiciona job à tabela sync_queue (QueueService.addToQueue)
   ↓
4. Job fica com status "queued"
   ↓
5. Worker (cron a cada 10s) verifica a fila
   ↓
6. Worker pega próximo job (por prioridade)
   ↓
7. Worker muda status para "processing"
   ↓
8. Worker invoca sync-store Edge Function
   ↓
9. sync-store sincroniza Klaviyo + Shopify
   ↓
10. sync-store SALVA dados no cache (store_sync_cache)
   ↓
11. sync-store retorna sucesso
   ↓
12. Worker marca job como "completed"
   ↓
13. Frontend detecta conclusão (polling) e recarrega dados do cache
```

### Proteções implementadas:

- ✅ **Concorrência limitada**: Máximo 3 jobs processando simultaneamente
- ✅ **Timeout automático**: Jobs travados > 10min são resetados para retry
- ✅ **Retry inteligente**: 3 tentativas antes de marcar como "failed"
- ✅ **Deduplicação**: Não permite jobs duplicados para mesmo store/período
- ✅ **Cache-first**: Sempre verifica cache antes de sincronizar

---

## 🔍 Monitoramento

### Ver jobs na fila:

```sql
-- Ver todos os jobs e seus status
SELECT
  id,
  store_id,
  status,
  period_start,
  period_end,
  retry_count,
  queued_at,
  started_at,
  completed_at,
  error_message
FROM sync_queue
ORDER BY queued_at DESC
LIMIT 20;
```

### Ver estatísticas da fila:

```sql
-- Usar a view criada pela migração
SELECT * FROM v_sync_queue_stats;
```

### Ver cache:

```sql
-- Ver dados em cache
SELECT
  id,
  store_id,
  data_type,
  period_start,
  period_end,
  source,
  synced_at
FROM store_sync_cache
ORDER BY synced_at DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### Problema: Jobs ficam travados em "processing"

**Solução:** O worker limpa automaticamente jobs travados > 10min, mas você pode limpar manualmente:

```sql
UPDATE sync_queue
SET status = 'failed',
    error_message = 'Manual cleanup',
    completed_at = NOW()
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '10 minutes';
```

### Problema: Worker não está processando a fila

**Diagnóstico:**

1. Verificar se o cron está rodando:
   ```sql
   -- Se usando pg_cron
   SELECT * FROM cron.job;
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```

2. Invocar worker manualmente para ver logs:
   ```bash
   curl -X POST https://SEU_PROJECT_ID.supabase.co/functions/v1/sync-worker \
     -H "Authorization: Bearer SUA_ANON_KEY"
   ```

3. Verificar logs no Supabase Dashboard:
   - Vá em **Edge Functions** → **sync-worker** → **Logs**

### Problema: Cache não está sendo usado

**Verificar:**

```sql
-- Ver se dados foram salvos no cache
SELECT * FROM store_sync_cache
WHERE store_id = 'SEU_STORE_ID'
ORDER BY synced_at DESC;
```

Se não houver registros, o sync-store pode não estar salvando. Verificar logs da Edge Function.

---

## 💰 Custos Estimados

### Nível 2 (implementado):

**Supabase:**
- Database: Incluído no plano Free (até 500MB)
- Edge Functions: Incluído no plano Free (até 500K invocations/mês)
- pg_cron (opcional): Requer plano Pro ($25/mês)

**Alternativas GRÁTIS para cron:**
- Cron-job.org: Grátis
- GitHub Actions: Grátis (2000 minutos/mês)
- Render.com Cron Jobs: Grátis

**Total: $0-5/mês** (pode ser totalmente grátis com alternativas)

---

## 📝 Próximos Passos (Opcional - Nível 3)

Se precisar escalar para mais de 100 lojas:

- Migrar para Workers separados (Upstash + Inngest)
- Webhooks em vez de polling
- Chunking de sincronizações grandes
- Priorização dinâmica

**Custo Nível 3:** ~$135-195/mês
**Tempo implementação:** 2-3 semanas

---

## ✅ Checklist Final

Antes de considerar concluído, verificar:

- [ ] Migração SQL executada com sucesso
- [ ] Edge Function `sync-worker` deployed
- [ ] Edge Function `sync-store` deployed (atualizada)
- [ ] Cron job configurado e rodando
- [ ] Teste manual de sincronização funcionando
- [ ] Cache sendo usado corretamente
- [ ] Jobs sendo processados pela fila
- [ ] Retry funcionando em caso de erro

---

## 🆘 Suporte

Se encontrar problemas:

1. Verificar logs das Edge Functions no Supabase Dashboard
2. Verificar tabela `sync_queue` para ver status dos jobs
3. Testar worker manualmente com curl
4. Verificar se o cron está executando

**Logs úteis:**

```bash
# Ver logs do worker
supabase functions logs sync-worker

# Ver logs do sync-store
supabase functions logs sync-store
```
