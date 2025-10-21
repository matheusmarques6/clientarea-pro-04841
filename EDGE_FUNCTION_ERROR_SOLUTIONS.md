# 🔥 Edge Function Error - 3 Soluções Completas

## ❌ Erro Atual

```
Erro ao iniciar sincronização 30d: Failed to send a request to the Edge Function
```

**URL testada:**
```
https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/sync-store
```

**Resposta:**
```json
{"code":"NOT_FOUND","message":"Requested function was not found"}
```

---

## 🔍 Análise Profunda do Problema

### **Causa Raiz**

A Edge Function `sync-store` **NÃO está deployada** no Supabase. Isso acontece porque:

1. ✅ **Código existe localmente** em `supabase/functions/sync-store/index.ts`
2. ✅ **Código está correto** (464 linhas, implementação completa)
3. ❌ **NÃO foi feito deploy** para o servidor Supabase
4. ❌ **Supabase retorna 404** quando frontend tenta chamar

### **Por Que Isso Acontece?**

Edge Functions Supabase são **serverless** e precisam ser deployadas separadamente:

```
Código Local (Git) ≠ Código no Servidor Supabase
```

O frontend está tentando chamar:
```typescript
supabase.functions.invoke('sync-store', { ... })
```

Mas o servidor responde:
```
404 NOT_FOUND - Function does not exist
```

### **Verificação Realizada**

```bash
$ curl https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/sync-store
{"code":"NOT_FOUND","message":"Requested function was not found"}
```

---

## ✅ Solução 1: Deploy das Edge Functions no Supabase (RECOMENDADO) ⭐

### **Descrição**

Deploy oficial das Edge Functions para o servidor Supabase usando a CLI.

### **Vantagens**

- ✅ **Solução definitiva** - Funciona em produção
- ✅ **Sem modificações no código** - Usa arquitetura planejada
- ✅ **Performance máxima** - Edge Functions são globalmente distribuídas
- ✅ **Gratuito** - 500k invocations/mês no plano free
- ✅ **Serverless** - Escalabilidade automática

### **Desvantagens**

- ⚠️ Precisa instalar Supabase CLI
- ⚠️ Requer autenticação com Supabase
- ⚠️ Tempo de deploy: ~2-3 minutos por função

---

### **Implementação Passo a Passo**

#### **1. Instalar Supabase CLI**

**Linux/macOS:**
```bash
npm install -g supabase
```

**Ou via Homebrew (macOS):**
```bash
brew install supabase/tap/supabase
```

**Ou via Scoop (Windows):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### **2. Login no Supabase**

```bash
supabase login
```

Isso vai:
1. Abrir o navegador
2. Pedir autorização
3. Gerar access token
4. Salvar credenciais em `~/.supabase/access-token`

#### **3. Link do Projeto**

```bash
cd /home/convertfy/projetos/clientarea-pro-04841
supabase link --project-ref bsotblbtrshqfiqyzisy
```

#### **4. Deploy das Edge Functions**

**Deploy individual (sync-store):**
```bash
supabase functions deploy sync-store --project-ref bsotblbtrshqfiqyzisy
```

**Deploy de todas as funções:**
```bash
supabase functions deploy --project-ref bsotblbtrshqfiqyzisy
```

**Deploy apenas das novas funções (recomendado):**
```bash
supabase functions deploy sync-store --project-ref bsotblbtrshqfiqyzisy
supabase functions deploy get-sync-status --project-ref bsotblbtrshqfiqyzisy
```

#### **5. Verificar Deploy**

**Listar funções deployadas:**
```bash
supabase functions list --project-ref bsotblbtrshqfiqyzisy
```

**Testar função:**
```bash
curl https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/sync-store \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"store_id":"test"}'
```

#### **6. Verificar Logs (Troubleshooting)**

```bash
supabase functions logs sync-store --project-ref bsotblbtrshqfiqyzisy
```

---

### **Resultado Esperado**

✅ Edge Function disponível em:
```
https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/sync-store
```

✅ Frontend consegue chamar sem erros

✅ Sincronização Klaviyo/Shopify funciona

---

### **Troubleshooting**

#### **Erro: "supabase: command not found"**

**Solução:**
```bash
npm install -g supabase
# ou
npx supabase login
```

#### **Erro: "Invalid project ref"**

**Solução:** Verificar se o project ref está correto:
```bash
cat supabase/config.toml | grep project_id
```

#### **Erro: "Authentication required"**

**Solução:**
```bash
supabase login
```

#### **Erro de CORS ao chamar a função**

**Solução:** Adicionar headers CORS na Edge Function:

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
})
```

---

## ✅ Solução 2: Usar Supabase Local Development (DESENVOLVIMENTO)

### **Descrição**

Rodar Edge Functions **localmente** usando Docker + Supabase CLI local.

### **Vantagens**

- ✅ **Desenvolvimento rápido** - Sem deploy a cada mudança
- ✅ **Debug fácil** - Logs em tempo real
- ✅ **Offline** - Não precisa de internet
- ✅ **Ambiente isolado** - Não afeta produção
- ✅ **Gratuito** - Roda tudo local

### **Desvantagens**

- ⚠️ Requer Docker instalado
- ⚠️ Consome recursos (RAM/CPU)
- ⚠️ Setup inicial mais complexo
- ⚠️ Apenas para desenvolvimento (não produção)

---

### **Implementação Passo a Passo**

#### **1. Instalar Docker**

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**macOS/Windows:**
- Baixar Docker Desktop: https://www.docker.com/products/docker-desktop

#### **2. Iniciar Supabase Local**

```bash
cd /home/convertfy/projetos/clientarea-pro-04841
supabase init  # Se ainda não foi feito
supabase start
```

Isso vai:
- ✅ Baixar imagens Docker do Supabase
- ✅ Iniciar PostgreSQL local
- ✅ Iniciar PostgREST (API)
- ✅ Iniciar Auth service
- ✅ Iniciar Storage service
- ✅ Iniciar Edge Functions runtime (Deno)

#### **3. Configurar .env para Ambiente Local**

**Criar `.env.local`:**
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon_key_local>
```

**Pegar a anon key local:**
```bash
supabase status
```

Procure por:
```
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **4. Rodar Edge Functions Localmente**

```bash
supabase functions serve sync-store --env-file .env.local
```

**Ou rodar todas:**
```bash
supabase functions serve --env-file .env.local
```

#### **5. Atualizar Frontend para Usar Local**

**Opção A: Usar .env.local automaticamente**

Vite já suporta `.env.local`:
```bash
npm run dev
```

**Opção B: Toggle manual no código**

```typescript
const SUPABASE_URL = import.meta.env.DEV
  ? 'http://localhost:54321'
  : 'https://bsotblbtrshqfiqyzisy.supabase.co'
```

#### **6. Testar Localmente**

```bash
curl http://localhost:54321/functions/v1/sync-store \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"store_id":"test"}'
```

---

### **Resultado Esperado**

✅ Edge Functions rodando em `http://localhost:54321/functions/v1/`

✅ Frontend chama funções locais

✅ Logs aparecem no terminal em tempo real

✅ Hot reload ao modificar código

---

### **Comandos Úteis**

```bash
# Ver status de todos os serviços
supabase status

# Ver logs das Edge Functions
supabase functions logs

# Parar Supabase local
supabase stop

# Resetar banco de dados local
supabase db reset

# Ver diff com produção
supabase db diff
```

---

## ✅ Solução 3: Implementar Fallback com API Route Proxy (HÍBRIDO)

### **Descrição**

Criar um proxy local que **simula** a Edge Function durante desenvolvimento, enquanto produção usa a real.

### **Vantagens**

- ✅ **Sem dependências externas** - Não precisa Supabase CLI
- ✅ **Sem Docker** - Roda apenas com Node/Bun
- ✅ **Fácil de configurar** - Apenas um arquivo
- ✅ **Flexível** - Pode usar dados mock
- ✅ **Fast iteration** - Mudanças instantâneas

### **Desvantagens**

- ⚠️ **Ambiente diferente** - Não testa Deno runtime
- ⚠️ **Manutenção duplicada** - Código em 2 lugares
- ⚠️ **Não testa permissões** - RLS, auth, etc
- ⚠️ **Apenas para dev** - Produção precisa do deploy real

---

### **Implementação Passo a Passo**

#### **1. Criar API Route Local**

**Criar `src/api/sync-store-proxy.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { KlaviyoResult, ShopifySummary } from '../types'

// Importar lógica das Edge Functions (adaptar para browser)
async function syncStoreLocal(storeId: string, periodStart: string, periodEnd: string) {
  // Implementação simplificada ou mock

  // Opção 1: Chamar APIs diretamente do browser (se permitir CORS)
  // Opção 2: Usar dados mock para desenvolvimento
  // Opção 3: Chamar backend intermediário (seu próprio servidor)

  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )

  // Buscar credenciais da loja
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single()

  if (!store) throw new Error('Store not found')

  // Simular chamadas Klaviyo e Shopify
  console.log('🔄 [DEV] Syncing store:', store.name)

  // Retornar dados mock
  return {
    success: true,
    job_id: crypto.randomUUID(),
    status: 'SUCCESS',
    summary: {
      klaviyo: {
        total_revenue: 15000,
        campaigns_revenue: 8000,
        flows_revenue: 7000,
        total_orders: 120,
        campaigns_count: 15,
        flows_count: 8
      },
      shopify: {
        total_orders: 450,
        total_sales: 67890.25
      }
    }
  }
}

export { syncStoreLocal }
```

#### **2. Criar Hook de Desenvolvimento**

**Atualizar `src/hooks/useDashboardData.ts`:**

```typescript
import { syncStoreLocal } from '../api/sync-store-proxy'

// No início do hook
const isDevelopment = import.meta.env.DEV

// Na função handleSync
const handleSync = async () => {
  try {
    setIsSyncing(true)

    if (isDevelopment) {
      // Ambiente de desenvolvimento - usar proxy local
      console.log('🔧 [DEV MODE] Using local sync proxy')

      const result = await syncStoreLocal(
        storeId,
        periodStart,
        periodEnd
      )

      sonnerToast.success(`Sincronização ${period} concluída (DEV MODE)!`)
      await loadData()

    } else {
      // Ambiente de produção - usar Edge Function real
      const { data, error } = await supabase.functions.invoke('sync-store', {
        body: {
          store_id: storeId,
          period_start: periodStart,
          period_end: periodEnd
        }
      })

      if (error) throw error

      sonnerToast.success(`Sincronização ${period} concluída!`)
      await loadData()
    }

  } catch (error) {
    sonnerToast.error(`Erro ao sincronizar: ${error.message}`)
  } finally {
    setIsSyncing(false)
  }
}
```

#### **3. Criar Servidor Proxy Express (Alternativa)**

Se preferir um servidor separado:

**Criar `dev-server/proxy.js`:**

```javascript
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

app.post('/functions/v1/sync-store', async (req, res) => {
  const { store_id, period_start, period_end } = req.body

  console.log('🔄 [PROXY] Syncing store:', store_id)

  // Implementar lógica real ou retornar mock

  res.json({
    success: true,
    job_id: crypto.randomUUID(),
    status: 'SUCCESS',
    summary: {
      klaviyo: { total_revenue: 15000 },
      shopify: { total_sales: 67890 }
    }
  })
})

app.listen(3001, () => {
  console.log('🚀 Dev proxy running on http://localhost:3001')
})
```

**Rodar proxy:**
```bash
node dev-server/proxy.js
```

**Configurar frontend:**
```typescript
const FUNCTIONS_URL = import.meta.env.DEV
  ? 'http://localhost:3001/functions/v1'
  : 'https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1'
```

---

### **Resultado Esperado**

✅ Desenvolvimento usa código local/mock

✅ Produção usa Edge Functions reais

✅ Sem erros 404 durante desenvolvimento

✅ Iteração rápida sem deploys

---

## 📊 Comparação das 3 Soluções

| Critério | Solução 1: Deploy Real | Solução 2: Supabase Local | Solução 3: Proxy/Mock |
|----------|----------------------|--------------------------|---------------------|
| **Setup** | Médio (CLI install) | Complexo (Docker) | Simples (apenas código) |
| **Tempo inicial** | 5-10 min | 15-20 min | 5 min |
| **Ambiente** | Produção real | Idêntico produção | Diferente produção |
| **Performance** | Excelente | Bom | Excelente (local) |
| **Debug** | Logs remotos | Logs locais | Logs diretos |
| **Custo** | Gratuito (500k/mês) | Gratuito | Gratuito |
| **Internet** | Necessária | Não necessária | Não necessária |
| **Docker** | ❌ Não precisa | ✅ Obrigatório | ❌ Não precisa |
| **Ideal para** | Produção | Dev completo | Prototipagem rápida |

---

## 🎯 Recomendação Final

### **Para Resolver AGORA (Curto Prazo):**

Use **Solução 3 (Proxy/Mock)** para continuar desenvolvendo:
- ✅ 5 minutos de setup
- ✅ Sem dependências extras
- ✅ Testa o frontend imediatamente

### **Para Produção (Médio Prazo):**

Use **Solução 1 (Deploy Real)**:
- ✅ Arquitetura correta
- ✅ Performance máxima
- ✅ Solução definitiva

### **Para Desenvolvimento Contínuo (Longo Prazo):**

Use **Solução 2 (Supabase Local)**:
- ✅ Ambiente completo
- ✅ Testa tudo (DB, Auth, Functions)
- ✅ Desenvolvimento profissional

---

## 📋 Plano de Ação Recomendado

### **Fase 1: Desenvolvimento Imediato (Hoje)**

```bash
# Implementar Solução 3 (Proxy/Mock)
# Tempo: 15 minutos
```

1. Criar arquivo proxy mock
2. Atualizar hook com toggle DEV/PROD
3. Testar sincronização localmente
4. Continuar desenvolvimento

### **Fase 2: Deploy Produção (Esta Semana)**

```bash
# Implementar Solução 1 (Deploy Real)
# Tempo: 30 minutos
```

1. Instalar Supabase CLI
2. Deploy Edge Functions
3. Testar em produção
4. Configurar monitoramento

### **Fase 3: Setup Ambiente Dev Completo (Próxima Semana)**

```bash
# Implementar Solução 2 (Supabase Local)
# Tempo: 1-2 horas
```

1. Instalar Docker
2. Configurar Supabase local
3. Migrar dados de teste
4. Documentar processo

---

**Qual solução você quer implementar primeiro?** Posso ajudar com qualquer uma delas! 🚀
