# 🐛 Debug: Erro de Sincronização

## Erro Atual
```
Erro ao iniciar sincronização 30d: Edge Function returned a non-2xx status code
```

## Possíveis Causas

### 1. Edge Function `start_klaviyo_job` não existe
**Problema**: O código chama `start_klaviyo_job` na linha 501 de `useDashboardData.ts`, mas esta função não está deploy no Supabase.

**Verificar**:
```sql
-- No Supabase SQL Editor
SELECT * FROM stores WHERE id = 'SEU_STORE_ID';
```

Verifique se os campos estão preenchidos:
- `klaviyo_private_key`
- `klaviyo_site_id`
- `shopify_access_token`
- `shopify_domain`

### 2. Credenciais não configuradas
**Problema**: A loja não tem as credenciais do Klaviyo/Shopify configuradas.

**Solução**:
1. Vá em "Configurações" da loja
2. Adicione:
   - Klaviyo Private Key
   - Klaviyo Site ID
   - Shopify Access Token
   - Shopify Domain

### 3. Edge Function retornando erro
**Problema**: A função `start_klaviyo_job` existe mas está retornando erro.

**Como verificar os logs**:
1. Acesse: https://supabase.com/dashboard/project/bsotblbtrshqfiqyzisy/functions
2. Clique em "start_klaviyo_job"
3. Veja a aba "Logs"
4. Procure por erros recentes

### 4. Jobs travados no banco
**Problema**: Há jobs em processamento que estão bloqueando novos syncs.

**Verificar**:
```sql
-- Buscar jobs travados
SELECT * FROM n8n_jobs
WHERE store_id = 'SEU_STORE_ID'
AND status IN ('QUEUED', 'PROCESSING')
AND started_at < NOW() - INTERVAL '30 minutes'
ORDER BY started_at DESC;
```

**Limpar jobs travados**:
```sql
UPDATE n8n_jobs
SET status = 'ERROR',
    error = 'Job timeout - manually cleaned',
    finished_at = NOW()
WHERE store_id = 'SEU_STORE_ID'
AND status IN ('QUEUED', 'PROCESSING')
AND started_at < NOW() - INTERVAL '30 minutes';
```

## Como Resolver

### Opção 1: Verificar credenciais da loja
```sql
SELECT
  id,
  name,
  klaviyo_private_key IS NOT NULL as has_klaviyo_key,
  klaviyo_site_id IS NOT NULL as has_klaviyo_site,
  shopify_access_token IS NOT NULL as has_shopify_token,
  shopify_domain IS NOT NULL as has_shopify_domain
FROM stores
WHERE id = 'SEU_STORE_ID';
```

### Opção 2: Verificar se a Edge Function existe
1. Vá para: https://supabase.com/dashboard/project/bsotblbtrshqfiqyzisy
2. Menu: Edge Functions
3. Procure por `start_klaviyo_job`

Se não existir, você precisa criar esta função ou modificar o código para usar outra abordagem.

### Opção 3: Ver logs em tempo real
```bash
# Se você tem Supabase CLI instalado
supabase functions logs start_klaviyo_job
```

## Ações Imediatas

1. ✅ Verificar se a loja tem credenciais configuradas
2. ✅ Verificar se a Edge Function `start_klaviyo_job` existe
3. ✅ Limpar jobs travados (SQL acima)
4. ✅ Tentar sincronizar novamente

## Informações do Projeto

- **Supabase URL**: https://bsotblbtrshqfiqyzisy.supabase.co
- **Projeto ID**: bsotblbtrshqfiqyzisy
- **Tabelas**:
  - `stores` - Credenciais das lojas
  - `n8n_jobs` - Jobs de sincronização
  - `klaviyo_summaries` - Dados do Klaviyo
  - `channel_revenue` - Receita por canal

## Próximos Passos

Se o erro persistir:
1. Compartilhe os logs da Edge Function
2. Verifique os dados da tabela `stores`
3. Verifique se há jobs travados em `n8n_jobs`
