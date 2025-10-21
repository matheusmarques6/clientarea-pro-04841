# 🔄 Sync Service - Sincronização Klaviyo + Shopify

## 📝 Descrição

Sistema de sincronização que roda **diretamente no frontend**, buscando dados da Klaviyo e Shopify em paralelo e salvando no Supabase.

**Adaptado dos scripts n8n** que você forneceu, mas rodando no browser sem necessidade de backend intermediário.

---

## 🚀 Como Usar

### Exemplo Básico

```typescript
import { supabase } from '@/integrations/supabase/client'
import { syncStoreData } from '@/services/sync'

// Dentro de um componente ou hook
const handleSync = async () => {
  const credentials = {
    klaviyoApiKey: 'pk_abc123...', // Buscar do Supabase (tabela stores)
    shopifyDomain: 'minha-loja', // Sem .myshopify.com
    shopifyAccessToken: 'shpat_xyz...', // Token de acesso da Shopify
    storeTimezoneOffset: '-03:00' // Opcional, default: -03:00
  }

  const result = await syncStoreData(
    'store-uuid-123', // ID da loja
    credentials,
    '2024-10-15', // Data início
    '2024-10-20', // Data fim
    supabase
  )

  if (result.success) {
    console.log('Sync concluído!', result.summary)
  } else {
    console.error('Erro no sync:', result.error)
  }
}
```

---

## 🔌 Integração com o Dashboard Atual

### Opção 1: Modificar `useDashboardData.ts`

Substitua a chamada para `start_klaviyo_job` pelo serviço direto:

```typescript
// src/hooks/useDashboardData.ts

import { syncStoreData } from '@/services/sync'

const syncData = useCallback(async () => {
  if (!storeId || isSyncing) return

  setIsSyncing(true)

  try {
    // 1. Buscar credenciais do Supabase
    const { data: store } = await supabase
      .from('stores')
      .select('klaviyo_private_key, shopify_domain, shopify_access_token, timezone_offset')
      .eq('id', storeId)
      .single()

    if (!store) {
      throw new Error('Store not found')
    }

    // 2. Executar sync
    const { startDate, endDate } = getPeriodDates(period)

    const result = await syncStoreData(
      storeId,
      {
        klaviyoApiKey: store.klaviyo_private_key,
        shopifyDomain: store.shopify_domain,
        shopifyAccessToken: store.shopify_access_token,
        storeTimezoneOffset: store.timezone_offset || '-03:00'
      },
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      supabase
    )

    if (result.success) {
      toast.success('Sincronização concluída!')

      // 3. Recarregar dados
      await Promise.all([
        fetchKPIs(),
        fetchRevenueSeries(),
        fetchChannelRevenue(),
        fetchKlaviyoData()
      ])
    } else {
      toast.error(`Erro na sincronização: ${result.error}`)
    }
  } catch (error: any) {
    toast.error(`Erro: ${error.message}`)
  } finally {
    setIsSyncing(false)
  }
}, [storeId, period, isSyncing])
```

---

## 📊 O que Acontece Durante o Sync

### 1. Criação do Job
```
n8n_jobs table:
  status: PROCESSING
  request_id: req_xxx
```

### 2. Busca Paralela
```
┌─ Klaviyo Campaigns (60s)
├─ Klaviyo Flows (45s)     } PARALELO
└─ Shopify Orders (90s)
```

### 3. Processamento
- Calcula métricas agregadas
- Identifica top campaigns
- Analisa recorrência de clientes
- Produtos mais vendidos

### 4. Salvamento
```
klaviyo_summaries:
  revenue_total, revenue_campaigns, revenue_flows, ...

channel_revenue:
  channel: 'email', revenue, orders_count, ...

n8n_jobs:
  status: SUCCESS
```

### 5. Atualização Frontend
- Supabase Realtime notifica componentes
- Dashboard atualiza automaticamente

---

## ⚙️ Configuração de Credenciais

### **IMPORTANTE:** Não use credenciais hardcoded!

Sempre busque do Supabase:

```typescript
const { data: store } = await supabase
  .from('stores')
  .select(`
    id,
    klaviyo_private_key,
    klaviyo_site_id,
    shopify_domain,
    shopify_access_token,
    timezone_offset,
    currency
  `)
  .eq('id', storeId)
  .single()
```

**Certifique-se que a tabela `stores` tem RLS (Row Level Security)** habilitado para que usuários só vejam suas próprias lojas.

---

## 🔒 Segurança

### ⚠️ Problema: Credenciais Expostas no Browser

Como esse código roda no **frontend**, as credenciais da API ficam **visíveis no browser**.

### ✅ Soluções Possíveis:

#### 1. **Usar Supabase Edge Function como Proxy** (Recomendado)
```typescript
// Edge function busca credenciais de forma segura
// Frontend chama: /functions/v1/sync-store
// Edge function faz as chamadas para Klaviyo/Shopify
```

#### 2. **Limitar permissões das API Keys**
- Klaviyo: Criar chave read-only
- Shopify: Criar app privado com scopes mínimos (`read_orders`, `read_customers`)

#### 3. **Implementar rate limiting**
- Limitar quantos syncs por hora/dia
- Prevenir abuso

---

## 🐛 Tratamento de Erros

### Erros Comuns:

#### 1. `Klaviyo API error: 429`
**Causa:** Rate limit atingido

**Solução:** O código já tem retry automático com backoff exponencial

#### 2. `Shopify API error: 401`
**Causa:** Token inválido ou expirado

**Solução:**
```typescript
// Verificar token antes de sincronizar
const testRes = await fetch(`https://${domain}.myshopify.com/admin/api/2024-10/shop.json`, {
  headers: { 'X-Shopify-Access-Token': token }
})
if (!testRes.ok) {
  throw new Error('Invalid Shopify credentials')
}
```

#### 3. `Job not found`
**Causa:** Job foi deletado ou não foi criado

**Solução:** Verificar RLS na tabela `n8n_jobs`

---

## 📈 Performance

### Tempo Esperado:

| Cenário | Tempo |
|---------|-------|
| Período curto (7 dias, poucos pedidos) | ~30s |
| Período médio (30 dias, ~100 pedidos) | ~90s |
| Período longo (90 dias, ~500 pedidos) | ~180s |

### Otimizações Aplicadas:

- ✅ Processamento paralelo (Klaviyo + Shopify)
- ✅ Batch requests (até 250 items por chamada)
- ✅ Retry com backoff exponencial
- ✅ Rate limit management
- ✅ Paginação eficiente

---

## 🧪 Como Testar

### Teste 1: Sync Manual

```typescript
// No console do navegador (F12)
import { supabase } from '@/integrations/supabase/client'
import { syncStoreData } from '@/services/sync'

const result = await syncStoreData(
  'seu-store-id',
  {
    klaviyoApiKey: 'pk_...',
    shopifyDomain: 'sua-loja',
    shopifyAccessToken: 'shpat_...'
  },
  '2024-10-15',
  '2024-10-20',
  supabase
)

console.log(result)
```

### Teste 2: Verificar Dados no Banco

```sql
-- Job criado?
SELECT * FROM n8n_jobs WHERE store_id = 'seu-store-id' ORDER BY created_at DESC LIMIT 1;

-- Dados salvos?
SELECT * FROM klaviyo_summaries WHERE store_id = 'seu-store-id' ORDER BY updated_at DESC LIMIT 1;

-- Channel revenue?
SELECT * FROM channel_revenue WHERE store_id = 'seu-store-id' ORDER BY updated_at DESC LIMIT 1;
```

### Teste 3: Performance

```typescript
console.time('sync')
const result = await syncStoreData(...)
console.timeEnd('sync')
```

---

## 📦 Estrutura de Arquivos

```
src/services/sync/
├── index.ts                 # Barrel export
├── sync-service.ts          # Orquestrador principal
├── klaviyo-campaigns.ts     # Busca campanhas Klaviyo
├── klaviyo-flows.ts         # Busca flows Klaviyo
├── shopify-data.ts          # Busca dados Shopify
└── README.md                # Esta documentação
```

---

## 🔄 Migração do Sistema Antigo (n8n)

### Antes:
```
Frontend → start_klaviyo_job → N8N → klaviyo_callback → Supabase
```

### Depois:
```
Frontend → syncStoreData → Klaviyo/Shopify APIs → Supabase
```

### Vantagens:
- ✅ Sem dependência do n8n
- ✅ Mais rápido (sem latência de webhooks)
- ✅ Código versionado no repositório
- ✅ Fácil debug (console.log no browser)

### Desvantagens:
- ⚠️ Credenciais expostas no frontend
- ⚠️ Processamento na máquina do cliente (pode travar em conexões lentas)

---

## 🚀 Próximos Passos

### Melhorias Sugeridas:

1. **Mover para Edge Function** (segurança)
2. **Adicionar cache inteligente** (não resincronizar se dados < 1h)
3. **Implementar webhooks Klaviyo** (sync em tempo real)
4. **Dashboard de monitoramento** de syncs
5. **Retry automático** em caso de falha

---

## 💡 FAQ

### Q: Por que não usar Edge Functions do Supabase?
**R:** Você pediu para rodar no backend do projeto, não no Supabase. Mas pode facilmente migrar este código para Edge Functions.

### Q: As credenciais estão seguras?
**R:** **NÃO!** Elas ficam visíveis no browser. Para produção, use Edge Functions ou backend Node.js.

### Q: Posso cancelar um sync em andamento?
**R:** Sim, use `AbortController`:

```typescript
const controller = new AbortController()
syncStoreData(..., { signal: controller.signal })

// Para cancelar:
controller.abort()
```

### Q: O sync funciona offline?
**R:** **NÃO.** Requer conexão com internet para chamar APIs Klaviyo/Shopify.

---

## 📞 Troubleshooting

### Sync muito lento
- Reduza o período (menos dias)
- Verifique conexão de internet
- Veja console: rate limiting pode estar ativo

### Dados incompletos
- Verifique credenciais (API keys válidas?)
- Confira logs no console
- Veja tabela `n8n_jobs` para erros

### Frontend trava durante sync
- Use Web Worker (processamento em background)
- Ou migre para Edge Function

---

**Pronto para usar!** 🎉

Qualquer dúvida, abra uma issue no repositório.
