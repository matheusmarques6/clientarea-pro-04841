# 📡 Análise Completa da Estrutura de Requisições API

## Klaviyo & Shopify - Documentação Técnica

---

## 🎯 KLAVIYO API

### **Base URL**
```
https://a.klaviyo.com/api
```

### **Autenticação**
```typescript
Headers: {
  'Authorization': 'Klaviyo-API-Key {apiKey}',
  'Accept': 'application/json',
  'revision': '2024-10-15'  // Versão da API
}
```

---

## 📋 **ENDPOINTS KLAVIYO**

### **1. GET /metrics**
**Objetivo**: Buscar todas as métricas disponíveis (para encontrar "Placed Order")

**Request:**
```http
GET https://a.klaviyo.com/api/metrics
Headers:
  Authorization: Klaviyo-API-Key pk_xxx
  Accept: application/json
  revision: 2024-10-15
```

**Response:**
```json
{
  "data": [
    {
      "id": "W8Gk3c",
      "type": "metric",
      "attributes": {
        "name": "Placed Order",
        "integration": {
          "object": "integration",
          "id": "xxx",
          "name": "Shopify"
        },
        "created": "2023-01-01T00:00:00+00:00",
        "updated": "2024-01-01T00:00:00+00:00"
      }
    }
  ]
}
```

**Tratamento:**
```typescript
// Filtra métricas por nome
const placedOrders = metrics.filter(m => m.attributes?.name === 'Placed Order')

// Se múltiplas métricas, testa qual tem mais dados
if (placedOrders.length > 1) {
  // Executa flow-values-report em paralelo (limit: 3)
  // Seleciona a métrica com maior revenue
}

// Fallback se não encontrar
metricaId = 'W8Gk3c' // Default ID
```

---

### **2. GET /campaigns**
**Objetivo**: Buscar todas as campanhas de email

**Request:**
```http
GET https://a.klaviyo.com/api/campaigns?filter=equals(messages.channel,"email")
Headers:
  Authorization: Klaviyo-API-Key pk_xxx
  Accept: application/json
  revision: 2024-10-15
```

**Query Parameters:**
- `filter`: Filtro Klaviyo Query Language
  - `equals(messages.channel,"email")` - Apenas campanhas de email

**Response:**
```json
{
  "data": [
    {
      "id": "01GDDKASAP8TKDDA2GRZDSVP4H",
      "type": "campaign",
      "attributes": {
        "name": "Campaign Name",
        "status": "Sent",
        "send_time": "2025-01-15T10:00:00+00:00",
        "created_at": "2025-01-10T12:00:00+00:00",
        "updated_at": "2025-01-15T10:00:00+00:00"
      }
    }
  ],
  "links": {
    "self": "...",
    "next": "...",
    "prev": "..."
  }
}
```

**Filtro de Período (Cliente):**
```typescript
// Filtra no lado do cliente por send_time
const campanhasDoPeriodo = todasCampanhas.filter(camp => {
  const sendTime = camp.attributes?.send_time
  if (!sendTime) return false
  const dataCamp = new Date(sendTime)
  return dataCamp >= inicio && dataCamp <= fim
})
```

---

### **3. POST /campaign-values-reports/**
**Objetivo**: Buscar receita e conversões de uma campanha específica

**Request:**
```http
POST https://a.klaviyo.com/api/campaign-values-reports/
Headers:
  Authorization: Klaviyo-API-Key pk_xxx
  Accept: application/json
  Content-Type: application/json
  revision: 2024-10-15

Body:
{
  "data": {
    "type": "campaign-values-report",
    "attributes": {
      "timeframe": {
        "start": "2025-01-01T00:00:00Z",
        "end": "2025-01-31T23:59:59Z"
      },
      "conversion_metric_id": "W8Gk3c",
      "filter": "equals(campaign_id,\"01GDDKASAP8TKDDA2GRZDSVP4H\")",
      "statistics": ["conversion_value", "conversions"]
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "type": "campaign-values-report",
    "id": "01GDDKASAP8TKDDA2GRZDSVP4H",
    "attributes": {
      "results": [
        {
          "dimensions": ["01GDDKASAP8TKDDA2GRZDSVP4H"],
          "statistics": {
            "conversion_value": 15000.50,
            "conversions": 120
          }
        }
      ]
    }
  }
}
```

**Processamento Paralelo:**
```typescript
// Processa até 3 campanhas em paralelo
await execQueue(baseCampanhas, 3, async (campanhaData) => {
  const valuesRes = await klaviyoRequest(apiKey, 'POST', '/campaign-values-reports/', '', valuesBody)

  if (valuesRes.success && valuesRes.data?.data?.attributes?.results?.[0]) {
    const stats = valuesRes.data.data.attributes.results[0].statistics || {}
    campanhaData.receita = stats.conversion_value || 0
    campanhaData.conversoes = stats.conversions || 0
  }

  return campanhaData
})
```

---

### **4. GET /flows**
**Objetivo**: Buscar todos os flows (automações)

**Request:**
```http
GET https://a.klaviyo.com/api/flows
Headers:
  Authorization: Klaviyo-API-Key pk_xxx
  Accept: application/json
  revision: 2024-10-15
```

**Response:**
```json
{
  "data": [
    {
      "id": "Y6nRLr",
      "type": "flow",
      "attributes": {
        "name": "Welcome Series",
        "status": "live",
        "archived": false,
        "created": "2024-01-01T00:00:00+00:00",
        "updated": "2025-01-15T00:00:00+00:00",
        "trigger_type": "List"
      }
    }
  ]
}
```

---

### **5. POST /flow-values-reports/**
**Objetivo**: Buscar receita e conversões de um flow específico

**Request:**
```http
POST https://a.klaviyo.com/api/flow-values-reports/
Headers:
  Authorization: Klaviyo-API-Key pk_xxx
  Accept: application/json
  Content-Type: application/json
  revision: 2024-10-15

Body:
{
  "data": {
    "type": "flow-values-report",
    "attributes": {
      "timeframe": {
        "start": "2025-01-01T00:00:00Z",
        "end": "2025-01-31T23:59:59Z"
      },
      "conversion_metric_id": "W8Gk3c",
      "filter": "equals(flow_id,\"Y6nRLr\")",
      "statistics": ["conversion_value", "conversions"]
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "type": "flow-values-report",
    "id": "Y6nRLr",
    "attributes": {
      "results": [
        {
          "dimensions": ["Y6nRLr"],
          "statistics": {
            "conversion_value": 7000.50,
            "conversions": 80
          }
        }
      ]
    }
  }
}
```

---

### **6. POST /flow-series-reports/**
**Objetivo**: Buscar estatísticas de performance do flow (email metrics)

**Request:**
```http
POST https://a.klaviyo.com/api/flow-series-reports/
Headers:
  Authorization: Klaviyo-API-Key pk_xxx
  Accept: application/json
  Content-Type: application/json
  revision: 2024-10-15

Body:
{
  "data": {
    "type": "flow-series-report",
    "attributes": {
      "timeframe": {
        "start": "2025-01-01T00:00:00Z",
        "end": "2025-01-31T23:59:59Z"
      },
      "filter": "equals(flow_id,\"Y6nRLr\")",
      "statistics": ["deliveries", "opens_unique", "clicks_unique"]
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "type": "flow-series-report",
    "id": "Y6nRLr",
    "attributes": {
      "results": [
        {
          "dimensions": ["Y6nRLr"],
          "statistics": {
            "deliveries": 1000,
            "opens_unique": 450,
            "clicks_unique": 120
          }
        }
      ]
    }
  }
}
```

**Cálculos:**
```typescript
const deliveries = perfStats.deliveries || 0
const opens = perfStats.opens_unique || 0
const clicks = perfStats.clicks_unique || 0

flowData.performance = {
  deliveries,
  opens_unique: opens,
  clicks_unique: clicks,
  open_rate: deliveries > 0 ? (opens / deliveries * 100).toFixed(2) : 0,
  click_rate: deliveries > 0 ? (clicks / deliveries * 100).toFixed(2) : 0
}
```

---

## 🔄 **KLAVIYO RETRY LOGIC**

### **Retry Configuration**
```typescript
const maxTentativas = 5  // Máximo de tentativas
let tentativa = 0

// Backoff exponencial
const backoff = Math.min(1500 * Math.pow(2, tentativa - 1), 8000)
// Tentativa 1: 1500ms
// Tentativa 2: 3000ms
// Tentativa 3: 6000ms
// Tentativa 4+: 8000ms (cap)
```

### **Tratamento de Erros**
```typescript
if (status === 429 || (status >= 500 && status < 600)) {
  // Rate limit ou server error

  // Verificar header retry-after
  const retryAfterMs = response.headers.get('retry-after') * 1000

  if (retryAfterMs > 0) {
    await sleep(retryAfterMs)  // Respeitar tempo sugerido
  }

  tentativa++
  continue  // Tentar novamente
}
```

### **Concorrência**
```typescript
// Limita a 3 requisições paralelas para evitar rate limit
await execQueue(items, 3, async (item) => {
  // Processa item
})
```

---

## 🛒 **SHOPIFY API**

### **Base URL**
```
https://{domain}.myshopify.com/admin/api/2024-10
```

### **Autenticação**
```typescript
Headers: {
  'X-Shopify-Access-Token': '{access_token}',
  'Content-Type': 'application/json'
}
```

---

## 📋 **ENDPOINTS SHOPIFY**

### **1. GET /orders.json**
**Objetivo**: Buscar pedidos do período

**Request:**
```http
GET https://{domain}.myshopify.com/admin/api/2024-10/orders.json?status=any&created_at_min=2025-01-01T00:00:00-03:00&created_at_max=2025-01-31T23:59:59-03:00&limit=250&order=created_at+asc
Headers:
  X-Shopify-Access-Token: shpat_xxx
  Content-Type: application/json
```

**Query Parameters:**
- `status=any` - Todos os status (open, closed, cancelled, etc)
- `created_at_min` - Data mínima (ISO 8601 com timezone)
- `created_at_max` - Data máxima (ISO 8601 com timezone)
- `limit=250` - Máximo de resultados por página
- `order=created_at+asc` - Ordenação crescente por data

**Response:**
```json
{
  "orders": [
    {
      "id": 450789469,
      "email": "customer@example.com",
      "created_at": "2025-01-15T10:30:00-03:00",
      "updated_at": "2025-01-15T10:35:00-03:00",
      "number": 1234,
      "total_price": "199.99",
      "subtotal_price": "179.99",
      "total_tax": "10.00",
      "total_discounts": "0.00",
      "total_line_items_price": "179.99",
      "currency": "BRL",
      "financial_status": "paid",
      "fulfillment_status": "fulfilled",
      "test": false,
      "cancelled_at": null,
      "line_items": [...],
      "shipping_lines": [...],
      "customer": {
        "id": 207119551,
        "email": "customer@example.com",
        "orders_count": 3
      },
      "refunds": [...]
    }
  ]
}
```

**Paginação (Cursor-based):**
```http
Headers Response:
  Link: <https://{domain}.myshopify.com/admin/api/2024-10/orders.json?page_info=xxx&limit=250>; rel="next"
```

```typescript
// Extrai page_info do header Link
const link = res.headers?.link || ''
const next = link.match(/<([^>]+)>;\s*rel="next"/)
const pageInfo = next[1].match(/page_info=([^&]+)/)[1]

// Próxima requisição
GET /orders.json?page_info={pageInfo}&limit=250
```

---

### **2. GET /orders.json (com fields específicos)**
**Objetivo**: Buscar pedidos com fulfillments (campos otimizados)

**Request:**
```http
GET https://{domain}.myshopify.com/admin/api/2024-10/orders.json?status=any&updated_at_min=2025-01-01T00:00:00-03:00&updated_at_max=2025-01-31T23:59:59-03:00&order=updated_at+asc&limit=250&fields=id,cancelled_at,test,fulfillments,updated_at,customer
Headers:
  X-Shopify-Access-Token: shpat_xxx
```

**Query Parameters:**
- `fields` - Campos específicos para reduzir payload
  - `id,cancelled_at,test,fulfillments,updated_at,customer`

**Response:**
```json
{
  "orders": [
    {
      "id": 450789469,
      "cancelled_at": null,
      "test": false,
      "updated_at": "2025-01-15T10:35:00-03:00",
      "customer": {
        "id": 207119551,
        "email": "customer@example.com"
      },
      "fulfillments": [
        {
          "id": 255858046,
          "order_id": 450789469,
          "status": "success",
          "created_at": "2025-01-15T11:00:00-03:00",
          "tracking_number": "1234567890",
          "tracking_company": "Correios"
        }
      ]
    }
  ]
}
```

---

### **3. GET /orders/{order_id}/fulfillments.json**
**Objetivo**: Buscar fulfillments de um pedido específico

**Request:**
```http
GET https://{domain}.myshopify.com/admin/api/2024-10/orders/450789469/fulfillments.json?limit=250
Headers:
  X-Shopify-Access-Token: shpat_xxx
```

**Response:**
```json
{
  "fulfillments": [
    {
      "id": 255858046,
      "order_id": 450789469,
      "status": "success",
      "created_at": "2025-01-15T11:00:00-03:00",
      "service": "manual",
      "tracking_number": "1234567890",
      "tracking_numbers": ["1234567890"],
      "tracking_url": "https://tracking.com/1234567890",
      "tracking_company": "Correios"
    }
  ]
}
```

**Processamento em Lotes:**
```typescript
// Processa 100 pedidos por vez, 10 em paralelo
await batchProcess(
  ordersNeedingFulfillments,
  100,  // Batch size
  10,   // Concorrência
  async (orderId) => {
    const res = await shopifyRequest(domain, token, `/orders/${orderId}/fulfillments.json?limit=250`)
    return res?.body?.fulfillments || []
  }
)
```

---

### **4. GET /customers.json (por IDs)**
**Objetivo**: Buscar múltiplos customers em uma requisição

**Request:**
```http
GET https://{domain}.myshopify.com/admin/api/2024-10/customers.json?ids=207119551,207119552,207119553&fields=id,email,orders_count&limit=250
Headers:
  X-Shopify-Access-Token: shpat_xxx
```

**Query Parameters:**
- `ids` - Lista de IDs separados por vírgula (máx: 250)
- `fields` - Campos específicos: `id,email,orders_count`
- `limit=250` - Máximo por requisição

**Response:**
```json
{
  "customers": [
    {
      "id": 207119551,
      "email": "customer@example.com",
      "orders_count": 5
    },
    {
      "id": 207119552,
      "email": "another@example.com",
      "orders_count": 2
    }
  ]
}
```

**Lotes de 250:**
```typescript
// Divide customers em lotes de 250
for (let i = 0; i < customerIdArray.length; i += 250) {
  const batch = customerIdArray.slice(i, i + 250)
  const idsParam = batch.join(',')

  const res = await shopifyRequest(
    domain,
    token,
    `/customers.json?ids=${idsParam}&fields=id,email,orders_count&limit=250`
  )

  // Delay entre lotes
  if (i + 250 < customerIdArray.length) {
    await sleep(100)
  }
}
```

---

### **5. GET /customers/search.json**
**Objetivo**: Buscar customer por email (para guests)

**Request:**
```http
GET https://{domain}.myshopify.com/admin/api/2024-10/customers/search.json?query=email:customer@example.com&fields=id,email,orders_count&limit=5
Headers:
  X-Shopify-Access-Token: shpat_xxx
```

**Query Parameters:**
- `query` - Query Shopify: `email:{email}`
- `fields` - `id,email,orders_count`
- `limit=5` - Máximo de resultados

**Response:**
```json
{
  "customers": [
    {
      "id": 207119551,
      "email": "customer@example.com",
      "orders_count": 3
    }
  ]
}
```

**Processamento em Lotes:**
```typescript
// Processa 20 emails por vez, 5 em paralelo
await batchProcess(
  emailsToResolve,
  20,  // Batch size
  5,   // Concorrência
  async (email) => {
    const res = await shopifyRequest(
      domain,
      token,
      `/customers/search.json?query=${encodeURIComponent('email:' + email)}&fields=id,email,orders_count&limit=5`
    )

    const customers = res?.body?.customers || []
    const exact = customers.find(c => normEmail(c.email) === email) || customers[0]

    return { email, customer: exact }
  }
)
```

---

## 🔄 **SHOPIFY RETRY LOGIC**

### **Retry Configuration**
```typescript
const retries = 3  // Máximo de tentativas
let attempt = 0

// Backoff exponencial
const backoff = Math.min(1000 * Math.pow(2, attempt), 8000)
// Tentativa 0: 1000ms
// Tentativa 1: 2000ms
// Tentativa 2: 4000ms
// Tentativa 3: 8000ms (cap)
```

### **Rate Limiting**
```typescript
// Monitora header x-shopify-shop-api-call-limit
const callLimit = res.headers.get('x-shopify-shop-api-call-limit')
// Formato: "32/40" (usado/capacidade)

if (callLimit) {
  const [used, cap] = callLimit.split('/').map(Number)
  rateLimitRemaining = cap - used

  // Se próximo do limite (< 5), aguarda
  if (rateLimitRemaining < 5) {
    await sleep(500)
  }
}
```

### **Tratamento de 429 (Rate Limit)**
```typescript
if (status === 429) {
  // Verifica header retry-after
  const retryAfter = parseFloat(res.headers.get('retry-after') || '1')
  await sleep(retryAfter * 1000)  // Aguarda tempo sugerido
  continue  // Tenta novamente
}
```

### **Tratamento de 5xx (Server Error)**
```typescript
if (status >= 500 && attempt < retries) {
  // Backoff exponencial
  await sleep(Math.min(1000 * Math.pow(2, attempt), 8000))
  continue
}
```

### **Concorrência e Batching**
```typescript
// Processa em lotes com concorrência controlada
async function batchProcess(items, batchSize, concurrency, processFn) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    // Sub-lotes paralelos
    for (let j = 0; j < batch.length; j += concurrency) {
      const parallelBatch = batch.slice(j, j + concurrency)

      await Promise.allSettled(
        parallelBatch.map(item => processFn(item))
      )
    }

    // Delay entre grandes lotes se rate limit baixo
    if (rateLimitRemaining < 10) {
      await sleep(300)
    }
  }
}

// Exemplo de uso:
// - batchSize: 100 (processa 100 de cada vez)
// - concurrency: 10 (10 requisições paralelas)
// Total: Processa 10 itens em paralelo, até completar 100, depois próximo lote
```

---

## 📊 **COMPARAÇÃO KLAVIYO vs SHOPIFY**

| Aspecto | Klaviyo | Shopify |
|---------|---------|---------|
| **Autenticação** | Header `Authorization: Klaviyo-API-Key` | Header `X-Shopify-Access-Token` |
| **API Version** | Query param `revision` | Path `/admin/api/2024-10` |
| **Rate Limit** | ~3-5 req/s (não documentado) | 40 req/s (bucket leaky) |
| **Paginação** | Cursor (`links.next`) | Cursor (`page_info` no header Link) |
| **Limit máximo** | Varia por endpoint | 250 |
| **Retry Backoff** | 1.5s → 3s → 6s → 8s | 1s → 2s → 4s → 8s |
| **Max Retries** | 5 | 3 |
| **Concorrência** | 3 paralelas | 10 paralelas |
| **Filtros** | Query Language próprio | Query params padrão |
| **Timezone** | UTC (sempre Z) | Local (com offset) |

---

## 🔒 **SEGURANÇA**

### **Klaviyo**
- ✅ API Key nunca exposta no frontend
- ✅ Todas as requests server-side (Edge Functions)
- ✅ Revision fixada (`2024-10-15`)
- ✅ Timeout padrão: 30s

### **Shopify**
- ✅ Access Token nunca exposto no frontend
- ✅ Todas as requests server-side (Edge Functions)
- ✅ API Version fixada (`2024-10`)
- ✅ Timeout padrão: 30s

---

## ⚡ **PERFORMANCE**

### **Otimizações Klaviyo**
1. **Concorrência limitada**: Máx 3 requests paralelas
2. **Retry inteligente**: Respeita `retry-after` header
3. **Backoff exponencial**: Evita sobrecarga
4. **Cache de métrica**: Reutiliza `metricaId`

### **Otimizações Shopify**
1. **Paginação cursor**: Mais eficiente que offset
2. **Fields específicos**: Reduz payload
3. **Batch de customers**: 250 por request
4. **Concorrência alta**: 10 paralelas (rate limit permite)
5. **Rate limit monitoring**: Pausa se próximo do limite
6. **Lotes de 100**: Divide trabalho em chunks gerenciáveis

---

## �� **RESUMO TÉCNICO**

### **Fluxo Klaviyo**
```
1. GET /metrics                    → Busca métrica "Placed Order"
2. GET /campaigns                  → Busca todas campanhas email
3. POST /campaign-values-reports/  → Receita por campanha (3 paralelas)
4. GET /flows                      → Busca todos flows
5. POST /flow-values-reports/      → Receita por flow (3 paralelas)
6. POST /flow-series-reports/      → Performance por flow (3 paralelas)
```

**Total estimado**: 6 + (N_campanhas/3) + (N_flows/3) + (N_flows/3) requests

### **Fluxo Shopify**
```
1. GET /orders.json                → Todos pedidos (paginado)
2. GET /orders.json (fields)       → Pedidos c/ fulfillments (paginado)
3. GET /orders/{id}/fulfillments   → Fulfillments individuais (10 paralelas)
4. GET /customers.json (ids)       → Customers em lote (250 por vez)
5. GET /customers/search.json      → Resolve emails guest (5 paralelas)
```

**Total estimado**:
- Paginação: ceil(N_pedidos/250) × 2
- Fulfillments: ceil(N_sem_fulfillment/10)
- Customers: ceil(N_customers/250)
- Guests: ceil(N_guests/5)

---

**Documentação criada em**: 2025-01-21
**Versão**: 1.0
**Autor**: Claude Code AI
