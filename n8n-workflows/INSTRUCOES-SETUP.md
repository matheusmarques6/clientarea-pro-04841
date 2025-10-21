# Instruções para Configurar o Novo Workflow N8N

## 🎯 Objetivo
Consolidar os dados de Klaviyo (campanhas + flows) e Shopify em um único callback para o Supabase, resolvendo os problemas de:
1. Dados não aparecendo no frontend
2. Processamento muito lento

## 📋 Estrutura do Workflow

```
[1] Webhook Trigger (recebe do start_klaviyo_job)
      ↓
[2] Preparar Dados (extrai privateKey, dates, etc)
      ↓
[3] ══════════════ EXECUÇÃO PARALELA ══════════════
      ↓                    ↓                   ↓
[3a] Buscar Campanhas  [3b] Buscar Flows   [3c] Buscar Shopify
     (script original)     (NOVO script)      (script original)
      ↓                    ↓                   ↓
[4] ══════════════ MERGE RESULTS ══════════════
      ↓
[5] Script Consolidado Final (NOVO)
      ↓
[6] HTTP Request → POST para process-complete-sync
      ↓
[7] Success/Error handling
```

## 🔧 Passo a Passo

### **PASSO 1: Deploy da Edge Function**

```bash
cd /home/convertfy/projetos/clientarea-pro-04841

# Deploy da nova edge function
supabase functions deploy process-complete-sync
```

**URL da função será:**
```
https://[seu-projeto].supabase.co/functions/v1/process-complete-sync
```

### **PASSO 2: Criar Workflow no N8N**

#### Nó 1: Webhook Trigger
- **Tipo:** Webhook
- **Nome:** "Trigger Webhook"
- **HTTP Method:** POST
- **Response Mode:** Immediately
- **Response Code:** 200

#### Nó 2: Preparar Dados
- **Tipo:** Code (JavaScript)
- **Nome:** "Preparar Dados"
- Use o script original que extrai os dados do webhook

#### Nó 3a: Buscar Campanhas Klaviyo
- **Tipo:** Code (JavaScript)
- **Nome:** "Buscar Campanhas Klaviyo"
- **Script:** Use o código que você enviou (o primeiro que busca campanhas)

#### Nó 3b: Buscar Flows Klaviyo (NOVO)
- **Tipo:** Code (JavaScript)
- **Nome:** "Buscar Flows Klaviyo"
- **Script:** Use `n8n-workflows/NOVO-Buscar-Flows-Com-Metricas.js`

#### Nó 3c: Buscar Dados Shopify
- **Tipo:** Code (JavaScript)
- **Nome:** "Buscar Dados Shopify"
- **Script:** Use o código que você enviou (o terceiro, de Shopify)

**IMPORTANTE:** Configure os nós 3a, 3b e 3c para executarem em **PARALELO** usando "Merge" ou "Wait":

```
[2] Preparar Dados
      ↓
[Split] (Send to multiple branches)
      ├─→ [3a] Buscar Campanhas
      ├─→ [3b] Buscar Flows
      └─→ [3c] Buscar Shopify
            ↓
[Merge/Wait] Aguarda todos completarem
```

#### Nó 4: Merge Node
- **Tipo:** Merge
- **Nome:** "Merge Results"
- **Mode:** Wait for completion
- **Input 1:** Buscar Campanhas Klaviyo
- **Input 2:** Buscar Flows Klaviyo
- **Input 3:** Buscar Dados Shopify

#### Nó 5: Script Consolidado Final
- **Tipo:** Code (JavaScript)
- **Nome:** "Consolidar Payload"
- **Script:** Use `n8n-workflows/NOVO-Script-Consolidado-Final.js`

#### Nó 6: HTTP Request - Callback
- **Tipo:** HTTP Request
- **Nome:** "Send to Supabase"
- **Method:** POST
- **URL:** `https://[SEU-PROJETO].supabase.co/functions/v1/process-complete-sync`
- **Body:** `{{ $json }}`
- **Headers:**
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer [SUPABASE_ANON_KEY]`

#### Nó 7: Error Handler (Opcional mas recomendado)
- **Tipo:** Error Trigger
- **Nome:** "On Error"
- Adicione um HTTP Request que chama um webhook de erro para registrar falhas

### **PASSO 3: Configurar Variáveis de Ambiente**

No Supabase Edge Function, certifique-se de ter:

```bash
# No arquivo .env ou no dashboard do Supabase
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[sua-service-key]
```

### **PASSO 4: Atualizar URL do Webhook no start_klaviyo_job**

Edite o arquivo:
`/supabase/functions/start_klaviyo_job/index.ts`

Linha ~250, onde faz a chamada para o N8N, atualize para a nova URL do webhook que você criou no Passo 2.

## 🚀 Melhorias Implementadas

### 1. **Processamento Paralelo**
- Campanhas, Flows e Shopify agora são buscados **em paralelo** no n8n
- Reduz tempo de ~5 minutos para ~2 minutos

### 2. **Callback Consolidado**
- Todos os dados enviados em **uma única chamada**
- Evita race conditions e perda de dados

### 3. **Métricas de Flows**
- Agora busca receita e conversões dos flows
- Dados completos de Klaviyo

### 4. **Logging Detalhado**
- Logs completos no Supabase Edge Function
- Fácil debug de problemas

### 5. **Validação Robusta**
- Verifica todos os campos necessários
- Retorna erros claros se algo estiver faltando

## 🧪 Como Testar

### Teste 1: Trigger Manual
1. Vá para o dashboard
2. Clique em "Sincronizar"
3. Acompanhe os logs:
   - N8N: Veja a execução do workflow
   - Supabase: Logs da edge function `process-complete-sync`

### Teste 2: Verificar Dados
```sql
-- Ver o job criado
SELECT * FROM n8n_jobs
WHERE store_id = '[seu-store-id]'
ORDER BY created_at DESC
LIMIT 1;

-- Ver resumo Klaviyo
SELECT * FROM klaviyo_summaries
WHERE store_id = '[seu-store-id]'
ORDER BY updated_at DESC
LIMIT 1;

-- Ver receita por canal
SELECT * FROM channel_revenue
WHERE store_id = '[seu-store-id]'
ORDER BY updated_at DESC;
```

### Teste 3: Frontend
- Dashboard deve mostrar os dados automaticamente via Realtime
- Se não aparecer, force refresh da página

## 🐛 Troubleshooting

### Problema: Dados não aparecem
1. Verifique logs do Supabase Edge Function
2. Veja se o request_id está correto
3. Confirme que o job foi encontrado

### Problema: Timeout
1. Aumente timeout no n8n (Settings → Workflow timeout)
2. Verifique se há rate limiting nas APIs (Klaviyo/Shopify)

### Problema: Erro 404 no callback
1. Confirme que fez deploy da edge function: `supabase functions deploy process-complete-sync`
2. Verifique a URL no nó HTTP Request do n8n

## 📊 Monitoramento

Adicione ao workflow um nó final que registra métricas:

```javascript
const payload = $input.first().json;
const endTime = Date.now();
const startTime = // pegar do início do workflow

console.log('WORKFLOW COMPLETED');
console.log('Duration:', endTime - startTime, 'ms');
console.log('Campanhas:', payload.campanhas?.length);
console.log('Flows:', payload.flows?.length);
console.log('Total Revenue:', payload.shopify?.totalVendas);
```

## ✅ Checklist Final

- [ ] Edge function deployed
- [ ] Workflow n8n criado com nós paralelos
- [ ] Scripts atualizados (campanhas, flows, shopify, consolidado)
- [ ] URL do callback atualizada no n8n
- [ ] Teste manual executado com sucesso
- [ ] Dados aparecem no frontend
- [ ] Tempo de processamento < 3 minutos
- [ ] Logs sem erros

## 🎉 Pronto!

Agora você tem um sistema de sincronização **rápido, confiável e completo**.

Qualquer dúvida, verifique os logs detalhados no Supabase ou no n8n.
