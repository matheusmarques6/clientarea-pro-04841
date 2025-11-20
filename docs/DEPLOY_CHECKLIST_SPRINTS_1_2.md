# 🚀 Deploy Checklist - Sprints 1 & 2

Checklist completo para implantar as melhorias de infraestrutura e segurança.

**Data:** 19 de Janeiro de 2025
**Sprints:** 1 (Infraestrutura) + 2 (Segurança)
**Tempo Estimado de Deploy:** 2-3 horas

---

## 📋 PRÉ-REQUISITOS

### Antes de Começar

- [ ] Fazer backup completo do banco de dados Supabase
- [ ] Testar em ambiente de staging primeiro
- [ ] Comunicar equipe sobre janela de manutenção (se necessário)
- [ ] Ter acesso ao Supabase Dashboard (Settings → API)
- [ ] Ter acesso ao N8N workflow (se usar webhook validation)

### Ferramentas Necessárias

- [ ] Git instalado
- [ ] Acesso ao repositório
- [ ] Supabase CLI instalado (opcional, mas recomendado)
- [ ] OpenSSL para gerar secrets

---

## 🔐 ETAPA 1: GERAR SECRETS (15 minutos)

### 1.1 Gerar Encryption Key

```bash
# Gerar chave de 32 bytes (AES-256)
openssl rand -base64 32

# Copiar output (exemplo):
# dGVzdGtleTEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=
```

**⚠️ IMPORTANTE:**
- Salvar esta chave em local seguro (1Password, Vault)
- Se perder esta chave, todos os dados criptografados serão irrecuperáveis
- Usar a MESMA chave em dev/staging/production (ou dados não serão compatíveis)

### 1.2 Gerar N8N Webhook Secret

```bash
# Gerar secret de 64 caracteres
openssl rand -hex 32

# Copiar output (exemplo):
# a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890
```

### 1.3 Armazenar Secrets

**Supabase Dashboard:**
1. Ir para: Dashboard → Settings → Edge Functions → Secrets
2. Adicionar:
   - `ENCRYPTION_KEY` = (chave gerada no passo 1.1)
   - `N8N_WEBHOOK_SECRET` = (secret gerado no passo 1.2)
   - `ENVIRONMENT` = `production` (ou `staging`)
   - `LOG_LEVEL` = `error` (produção) ou `info` (staging)

**N8N Workflow:**
1. Abrir N8N workflow de Klaviyo
2. Adicionar step "Set Headers"
3. Configurar: `X-N8N-Signature` = HMAC SHA-256 do payload usando `N8N_WEBHOOK_SECRET`

---

## 📁 ETAPA 2: DEPLOY DE ARQUIVOS (30 minutos)

### 2.1 Commit e Push

```bash
cd /home/convertfy/projetos/clientarea-pro-04841

# Verificar mudanças
git status

# Adicionar arquivos
git add supabase/functions/_shared/
git add scripts/
git add docs/
git add .env.example
git add supabase/migrations/20250119000000_add_encrypted_keys.sql

# Commit
git commit -m "feat: add infrastructure and security improvements (Sprints 1+2)

- Add structured logger with log levels
- Add CORS whitelist handler
- Add shared types and utilities
- Add AES-256-GCM encryption service
- Add HMAC webhook signature validation
- Add input sanitizers (domain, email, URL, UUID)
- Add database migration for encrypted API keys
- Add environment variables documentation
- Add validation and migration scripts"

# Push
git push origin main
```

### 2.2 Deploy Edge Functions

**Opção A: Via Supabase Dashboard**
1. Dashboard → Edge Functions
2. Deploy função por função manualmente
3. Verificar logs após deploy

**Opção B: Via Supabase CLI (Recomendado)**
```bash
# Deploy todas as funções
supabase functions deploy

# Ou deploy individual
supabase functions deploy klaviyo_callback
supabase functions deploy start_klaviyo_job
```

### 2.3 Aplicar Migrations

```bash
# Via Supabase CLI
supabase db push

# Ou via SQL Editor no Dashboard
# Copiar conteúdo de: supabase/migrations/20250119000000_add_encrypted_keys.sql
# Colar e executar no SQL Editor
```

**Verificar Migration:**
```sql
-- Verificar se colunas foram criadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stores'
AND column_name IN ('shopify_access_token_encrypted', 'klaviyo_private_key_encrypted');

-- Deve retornar 2 linhas
```

---

## 🔄 ETAPA 3: MIGRAR DADOS EXISTENTES (1 hora)

### 3.1 Backup Antes de Migrar

```sql
-- Fazer backup da tabela stores
CREATE TABLE stores_backup_20250119 AS
SELECT * FROM stores;

-- Verificar backup
SELECT COUNT(*) FROM stores_backup_20250119;
```

### 3.2 Criar Edge Function de Migração

```typescript
// supabase/functions/admin-migrate-encrypt-keys/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encrypt } from '../_shared/crypto.ts'

serve(async (req) => {
  // ADMIN ONLY - verificar token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.includes('YOUR_ADMIN_TOKEN')) {
    return new Response('Forbidden', { status: 403 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Buscar todas as stores com credentials plaintext
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, shopify_access_token, klaviyo_private_key')
    .not('shopify_access_token', 'is', null)

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  const results = []

  for (const store of stores || []) {
    try {
      const encryptedShopify = store.shopify_access_token
        ? await encrypt(store.shopify_access_token)
        : null

      const encryptedKlaviyo = store.klaviyo_private_key
        ? await encrypt(store.klaviyo_private_key)
        : null

      await supabase
        .from('stores')
        .update({
          shopify_access_token_encrypted: encryptedShopify,
          klaviyo_private_key_encrypted: encryptedKlaviyo
        })
        .eq('id', store.id)

      results.push({ store_id: store.id, status: 'success' })
    } catch (err: any) {
      results.push({ store_id: store.id, status: 'error', error: err.message })
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 3.3 Executar Migração

```bash
# Deploy migration function
supabase functions deploy admin-migrate-encrypt-keys

# Executar (substitua YOUR_ADMIN_TOKEN)
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/admin-migrate-encrypt-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  | jq .

# Verificar resultados
# Todos devem ter status: "success"
```

### 3.4 Validar Dados Criptografados

```sql
-- Verificar que todos os stores foram migrados
SELECT
  id,
  CASE
    WHEN shopify_access_token_encrypted IS NOT NULL THEN '✅ Encrypted'
    WHEN shopify_access_token IS NOT NULL THEN '❌ Plaintext only'
    ELSE '⚠️  No credential'
  END as shopify_status,
  CASE
    WHEN klaviyo_private_key_encrypted IS NOT NULL THEN '✅ Encrypted'
    WHEN klaviyo_private_key IS NOT NULL THEN '❌ Plaintext only'
    ELSE '⚠️  No credential'
  END as klaviyo_status
FROM stores
ORDER BY id;

-- Todos devem mostrar "✅ Encrypted" ou "⚠️  No credential"
-- Se houver "❌ Plaintext only", repetir migração para essa store
```

---

## 🧪 ETAPA 4: TESTES (30 minutos)

### 4.1 Testar Logger

```bash
# Verificar logs da função
supabase functions logs klaviyo_callback --tail

# Deve mostrar logs estruturados em JSON:
# {"timestamp":"2025-01-19T...", "level":"info", "service":"klaviyo_callback", ...}
```

### 4.2 Testar CORS

```bash
# Testar CORS com origem permitida
curl -X OPTIONS \
  https://YOUR_PROJECT.supabase.co/functions/v1/start_klaviyo_job \
  -H "Origin: https://app.convertfy.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Deve retornar:
# Access-Control-Allow-Origin: https://app.convertfy.com

# Testar CORS com origem NÃO permitida
curl -X OPTIONS \
  https://YOUR_PROJECT.supabase.co/functions/v1/start_klaviyo_job \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Deve retornar:
# Access-Control-Allow-Origin: (vazio ou não incluído)
```

### 4.3 Testar Webhook Validation

```bash
# Gerar signature correta
PAYLOAD='{"test": "data"}'
SECRET='a1b2c3d4...' # Seu N8N_WEBHOOK_SECRET
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Enviar com signature válida
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/klaviyo_callback \
  -H "Content-Type: application/json" \
  -H "X-N8N-Signature: $SIGNATURE" \
  -d "$PAYLOAD"

# Deve retornar 200 ou 404 (job not found é ok para teste)

# Enviar com signature inválida
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/klaviyo_callback \
  -H "Content-Type: application/json" \
  -H "X-N8N-Signature: invalid-signature" \
  -d "$PAYLOAD"

# Deve retornar 403 Forbidden
```

### 4.4 Testar Encryption

```sql
-- Executar função de teste (criar esta função temporariamente)
CREATE OR REPLACE FUNCTION test_encryption()
RETURNS TABLE (
  original TEXT,
  encrypted TEXT,
  decrypted TEXT,
  match BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_key TEXT := 'test-api-key-12345';
BEGIN
  -- Esta função deve chamar suas Edge Functions de encrypt/decrypt
  -- Por simplificação, teste manualmente via Edge Function
  RAISE NOTICE 'Use Edge Function to test encryption';
END;
$$;
```

### 4.5 Testar Sync Completo

1. **Frontend:**
   - Fazer login
   - Ir para uma loja
   - Clicar em "Sync"
   - Verificar que não há erros de CORS

2. **Backend:**
   - Verificar logs: `supabase functions logs start_klaviyo_job`
   - Confirmar que credenciais foram descriptografadas corretamente
   - Confirmar que sync iniciou

3. **N8N:**
   - Verificar que webhook foi enviado com signature
   - Confirmar que callback foi aceito (não rejeitado por signature inválida)

---

## 🧹 ETAPA 5: LIMPEZA (15 minutos)

### 5.1 Remover Colunas Plaintext (CUIDADO!)

**⚠️ ATENÇÃO:** Só fazer isso DEPOIS de validar 100% que:
- Todos os syncs funcionam
- Nenhum código antigo está usando as colunas antigas
- Backup foi feito

```sql
-- VERIFICAR NOVAMENTE que tudo está criptografado
SELECT COUNT(*) FROM stores
WHERE shopify_access_token_encrypted IS NULL
  AND shopify_access_token IS NOT NULL;
-- Deve retornar 0

-- Se retornar 0, é seguro remover
ALTER TABLE stores
  DROP COLUMN shopify_access_token,
  DROP COLUMN klaviyo_private_key;

-- Verificar
\d stores
-- Colunas antigas não devem aparecer
```

### 5.2 Remover Função de Migração

```bash
# Deletar função temporária
supabase functions delete admin-migrate-encrypt-keys
```

### 5.3 Remover Backup (Após 7 dias)

```sql
-- Após confirmar que tudo está funcionando por pelo menos 7 dias
DROP TABLE stores_backup_20250119;
```

---

## 📊 ETAPA 6: MONITORAMENTO (Contínuo)

### 6.1 Configurar Alertas

**Supabase Dashboard:**
- Configurar alertas de erro rate > 5%
- Configurar alertas de latência > 5s

**Logs a Monitorar:**
```bash
# Errors nas funções
supabase functions logs --filter level=error

# Webhook rejections
supabase functions logs klaviyo_callback --filter "Invalid webhook signature"

# Decryption failures
supabase functions logs --filter "Decryption failed"
```

### 6.2 Métricas de Sucesso

Monitorar por 7 dias:
- [ ] Taxa de erro < 1%
- [ ] Latência média < 2s
- [ ] Zero webhooks rejeitados incorretamente
- [ ] Zero falhas de decryption
- [ ] CORS funcionando corretamente

---

## 🔄 ROLLBACK PLAN

Se algo der errado:

### Rollback Imediato (< 5 minutos)

```bash
# 1. Reverter Edge Functions
git revert HEAD
git push origin main
supabase functions deploy

# 2. Restaurar colunas antigas (se já deletadas)
ALTER TABLE stores
  ADD COLUMN shopify_access_token TEXT,
  ADD COLUMN klaviyo_private_key TEXT;

# 3. Copiar dados do backup
UPDATE stores s
SET
  shopify_access_token = b.shopify_access_token,
  klaviyo_private_key = b.klaviyo_private_key
FROM stores_backup_20250119 b
WHERE s.id = b.id;

# 4. Desabilitar feature flags
# Supabase Dashboard → Edge Functions → Secrets
# Mudar: FEATURE_WEBHOOK_VALIDATION = false
```

### Rollback Parcial

Se apenas uma feature está com problema:

```sql
-- Desabilitar apenas webhook validation
UPDATE public.settings
SET value = 'false'
WHERE key = 'FEATURE_WEBHOOK_VALIDATION';

-- Ou via env var no Supabase Dashboard
```

---

## ✅ CHECKLIST FINAL

### Pré-Deploy
- [ ] Backup do banco de dados feito
- [ ] Secrets gerados e salvos em local seguro
- [ ] Código revisado e testado em staging
- [ ] Equipe comunicada

### Deploy
- [ ] Secrets adicionados no Supabase Dashboard
- [ ] Migration aplicada e validada
- [ ] Edge Functions deployed
- [ ] Dados migrados para encrypted columns
- [ ] N8N configurado com signature

### Testes
- [ ] Logger funcionando (logs estruturados)
- [ ] CORS rejeitando origens não permitidas
- [ ] Webhook validation funcionando
- [ ] Encryption/decryption funcionando
- [ ] Sync completo testado end-to-end

### Pós-Deploy
- [ ] Monitoramento configurado
- [ ] Alertas funcionando
- [ ] Backup antigo agendado para remoção (7 dias)
- [ ] Documentação atualizada
- [ ] Equipe treinada nas novas features

---

## 📞 SUPORTE

**Em caso de problemas:**
1. Verificar logs: `supabase functions logs <function-name>`
2. Verificar secrets: Supabase Dashboard → Edge Functions → Secrets
3. Executar rollback se necessário
4. Consultar documentação: `docs/ENVIRONMENT_VARIABLES.md`

**Contatos:**
- Dev Team: [email/slack]
- Supabase Support: https://supabase.com/support
- Emergency Rollback: Seguir ROLLBACK PLAN acima

---

**Última Atualização:** 19 de Janeiro de 2025
**Versão:** 1.0
**Status:** ✅ Pronto para Deploy
