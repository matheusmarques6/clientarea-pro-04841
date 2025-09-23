# Dashboard - Integração com Shopify e Klaviyo

Este documento descreve a implementação do dashboard funcional com dados reais do Shopify e Klaviyo, mantendo exatamente o design original.

## Visão Geral

O dashboard agora conecta dados reais das integrações Shopify (pedidos) e Klaviyo (receita de email) ao invés de usar dados mockados, mantendo o mesmo visual e UX.

## Arquitetura

```
Frontend (React) → Edge Functions → Shopify/Klaviyo APIs → Supabase (persistência) → Dashboard
```

### Fluxo de Dados

1. **Sincronização**: Edge Functions buscam dados das APIs externas
2. **Persistência**: Dados são armazenados nas tabelas do Supabase
3. **Consulta**: Dashboard consulta dados via RPC functions e views
4. **Apresentação**: Mesma UI original, mas com dados reais

## Tabelas do Banco

### `orders`
Armazena pedidos do Shopify com upsert por `shopify_id`.

**Campos principais:**
- `store_id`: UUID da loja
- `shopify_id`: ID externo do Shopify (único)
- `code`: Número do pedido
- `total`: Valor total
- `currency`: Moeda
- `created_at`: Data do pedido
- `raw`: JSON completo do Shopify

### `channel_revenue`
Armazena receita atribuída por canal (email, SMS, WhatsApp).

**Campos principais:**
- `store_id`: UUID da loja
- `channel`: 'email', 'sms', 'whatsapp'
- `source`: 'campaign', 'flow', 'aggregate'
- `period_start/end`: Período da receita
- `revenue`: Valor da receita
- `currency`: Moeda

### `dashboard_cache`
Cache opcional para KPIs agregados (performance).

## Edge Functions

### 1. `shopify-orders-sync`
**Endpoint:** `POST /functions/v1/shopify-orders-sync?storeId=...&from=ISO&to=ISO`

- Busca pedidos do Shopify Admin API (v2023-10)
- Faz upsert na tabela `orders`
- Respeita rate limits e implementa retry
- Requer integração Shopify configurada

### 2. `klaviyo-revenue-sync`
**Endpoint:** `POST /functions/v1/klaviyo-revenue-sync?storeId=...&from=ISO&to=ISO`

- Busca receita atribuída de email do Klaviyo
- Faz upsert na tabela `channel_revenue`
- Atualmente com dados simulados (expandir para API real)
- Requer integração Klaviyo configurada

### 3. `dashboard-sync`
**Endpoint:** `POST /functions/v1/dashboard-sync?storeId=...`

- Executa sync completo (Shopify + Klaviyo) em paralelo
- Período padrão: últimos 30 dias
- Chamado pelo botão "Sincronizar" no dashboard

### 4. `dashboard-backfill`
**Endpoint:** `POST /functions/v1/dashboard-backfill?storeId=...&days=30`

- Backfill inicial de dados históricos
- Execução única por loja
- Configurável o número de dias

## RPC Functions

### `rpc_get_store_kpis`
Retorna KPIs agregados para o período:
```sql
SELECT rpc_get_store_kpis('store-uuid', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');
```

**Retorno:**
```json
{
  "total_revenue": 50000,
  "email_revenue": 15000,
  "sms_revenue": 5000,
  "whatsapp_revenue": 2000,
  "order_count": 100,
  "currency": "BRL",
  "convertfy_revenue": 22000
}
```

### `rpc_get_revenue_series`
Retorna série temporal para gráficos:
```sql
SELECT * FROM rpc_get_revenue_series('store-uuid', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z', 'day');
```

## Hook Personalizado

### `useDashboardData`
Hook React que gerencia estado e carregamento dos dados:

```typescript
const { kpis, chartData, channelRevenue, isLoading, isSyncing, syncData } = useDashboardData(storeId, period);
```

**Funcionalidades:**
- Carregamento automático quando período muda
- Estado de loading separado para dados vs sync
- Função de sync manual
- Cache automático no Supabase

## Segurança (RLS)

Todas as tabelas implementam Row Level Security:
- Usuário só acessa dados das lojas que tem permissão
- Verificação via tabela `v_user_stores`
- Edge Functions validam acesso antes de executar

**Políticas aplicadas:**
```sql
-- orders, channel_revenue, dashboard_cache
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = <table>.store_id
  )
);
```

## Configuração das Integrações

### Shopify
1. Configurar credenciais na tela de integrações
2. Campos necessários:
   - `shop_domain`: exemplo.myshopify.com
   - `access_token`: Token de acesso privado

### Klaviyo
1. Configurar credenciais na tela de integrações
2. Campos necessários:
   - `private_key`: Chave de API privada do Klaviyo

## Sincronização

### Automática
- Agendamento via Supabase Scheduler (15-60 min)
- Janela móvel de 48h para capturar atualizações

### Manual
- Botão "Sincronizar" no dashboard
- Executa sync completo para os últimos 30 dias
- Feedback visual com loading states

## Monitoramento

### Logs das Edge Functions
- Acesse: Supabase Dashboard → Functions → [nome-da-função] → Logs
- Monitore erros de API, rate limits, timeouts

### Métricas Importantes
- Taxa de sucesso dos syncs
- Tempo de resposta das APIs
- Volume de dados processados
- Erros de autenticação/autorização

## Troubleshooting

### Erros Comuns

1. **"Integration not found"**
   - Verificar se integração está configurada e ativa
   - Validar credenciais na tela de integrações

2. **"Rate limit exceeded"**
   - Aguardar o reset do rate limit
   - Implementar backoff exponencial (já implementado)

3. **"Access denied to store"**
   - Verificar se usuário tem permissão na loja
   - Conferir dados na tabela `v_user_stores`

4. **Dados não aparecem no dashboard**
   - Verificar se sync foi executado com sucesso
   - Conferir se há dados nas tabelas `orders` e `channel_revenue`
   - Validar período selecionado no dashboard

### Debug

```sql
-- Verificar pedidos carregados
SELECT COUNT(*), MIN(created_at), MAX(created_at) 
FROM orders 
WHERE store_id = 'your-store-id';

-- Verificar receita de email
SELECT SUM(revenue), channel, COUNT(*) 
FROM channel_revenue 
WHERE store_id = 'your-store-id' 
GROUP BY channel;

-- Testar função de KPIs
SELECT rpc_get_store_kpis(
  'your-store-id', 
  '2024-01-01T00:00:00Z', 
  '2024-12-31T23:59:59Z'
);
```

## Feature Flags

```env
USE_SHOPIFY_SYNC=true
USE_KLAVIYO_SYNC=true
INCLUDE_PRODUCT_COST=true
```

## Performance

### Otimizações Implementadas
- Índices nas tabelas principais
- Cache de KPIs na tabela `dashboard_cache`
- Views pré-calculadas para consultas frequentes
- Paginação nas APIs externas

### Recomendações
- Executar backfill em horários de baixo uso
- Monitorar logs de performance das Edge Functions
- Ajustar frequência de sync conforme necessidade

## Roadmap

### Próximas Funcionalidades
1. Implementar API real do Klaviyo (atualmente simulada)
2. Adicionar sync de SMS e WhatsApp
3. Alertas automáticos para falhas de sync
4. Dashboard de métricas de sync
5. Exportação de dados para análise

### Melhorias de Performance
1. Implementar cache Redis para consultas frequentes
2. Otimizar queries com materialised views
3. Compressão de dados históricos
4. Sync incremental mais eficiente