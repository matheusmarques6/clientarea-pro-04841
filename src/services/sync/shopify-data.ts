// ============================================================================
// SHOPIFY DATA SYNC SERVICE
// Adaptado do script n8n para rodar no frontend
// ============================================================================

interface ShopifySummary {
  pedidos: number
  pedidosProcessados: number
  totalOrders: number
  ordersProcessed: number
  vendasBrutas: number
  descontos: number
  devolucoes: number
  vendasLiquidas: number
  cobrancasFrete: number
  tributos: number
  totalVendas: number
  ticketMedio: number
  taxaClientesRecorrentes: number
  clientesTotalPeriodo: number
  clientesRecorrentes: number
  clientesPrimeiraVez: number
  produtosMaisVendidos: any[]
  produtosMaisReceita: any[]
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const toNum = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }

let rateLimitRemaining = 40

async function shopifyRequest(
  domain: string,
  token: string,
  endpoint: string,
  options: { retries?: number; method?: string } = {}
) {
  const { retries = 3, method = 'GET' } = options
  const baseURL = `https://${domain}.myshopify.com/admin/api/2024-10`
  const url = baseURL + endpoint

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        }
      })

      // Atualizar rate limit
      const callLimit = res.headers.get('x-shopify-shop-api-call-limit')
      if (callLimit) {
        const [used, cap] = callLimit.split('/').map(Number)
        rateLimitRemaining = cap - used

        // Se está próximo do limite, aguarda
        if (rateLimitRemaining < 5) {
          await sleep(500)
        }
      }

      if (!res.ok) {
        const status = res.status

        if (status === 429 && attempt < retries) {
          const retryAfter = parseFloat(res.headers.get('retry-after') || '1')
          await sleep(retryAfter * 1000)
          continue
        }

        if (status >= 500 && attempt < retries) {
          await sleep(Math.min(1000 * Math.pow(2, attempt), 8000))
          continue
        }

        throw new Error(`Shopify API error: ${status}`)
      }

      const body = await res.json()
      return { headers: Object.fromEntries(res.headers.entries()), body }

    } catch (e: any) {
      if (attempt < retries) {
        await sleep(1000 * Math.pow(2, attempt))
        continue
      }
      throw e
    }
  }
}

async function fetchPaged(
  domain: string,
  token: string,
  endpointBuilder: (pageInfo: string | null) => string,
  maxPages = 50
) {
  const results: any[] = []
  let pageInfo: string | null = null
  let pages = 0

  while (pages < maxPages) {
    const endpoint = endpointBuilder(pageInfo)
    const res = await shopifyRequest(domain, token, endpoint)

    const items = res?.body?.orders || res?.body?.fulfillments || res?.body?.customers || []
    if (!items.length) break

    results.push(...items)

    // Extrai próxima página do header Link
    const link = res.headers?.link || ''
    const next = link.match(/<([^>]+)>;\s*rel="next"/)
    if (!next) break

    const m = next[1].match(/page_info=([^&]+)/)
    pageInfo = m ? m[1] : null
    if (!pageInfo) break

    pages++
  }

  return results
}

async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  concurrency: number,
  processFn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    // Processa sub-lotes em paralelo
    for (let j = 0; j < batch.length; j += concurrency) {
      const parallelBatch = batch.slice(j, j + concurrency)

      const batchResults = await Promise.allSettled(
        parallelBatch.map(item => processFn(item))
      )

      results.push(...batchResults.map(r =>
        r.status === 'fulfilled' ? r.value : null
      ).filter(Boolean) as R[])
    }

    // Pequeno delay entre grandes lotes
    if (i + batchSize < items.length && rateLimitRemaining < 10) {
      await sleep(300)
    }
  }

  return results
}

export async function fetchShopifyData(
  domain: string,
  token: string,
  startDate: string,
  endDate: string,
  timezoneOffset: string = '-03:00'
): Promise<ShopifySummary> {

  const startLocal = `${startDate}T00:00:00${timezoneOffset}`
  const endLocal = `${endDate}T23:59:59${timezoneOffset}`

  console.log('[Shopify] Fetching orders...')

  // 1) Buscar TODOS os pedidos do período
  const orders = await fetchPaged(domain, token, (pageInfo) => {
    return pageInfo
      ? `/orders.json?page_info=${encodeURIComponent(pageInfo)}&limit=250`
      : `/orders.json?status=any&created_at_min=${encodeURIComponent(startLocal)}&created_at_max=${encodeURIComponent(endLocal)}&limit=250&order=created_at+asc`
  })

  console.log(`[Shopify] Total orders: ${orders.length}`)

  // 2) Buscar pedidos com fulfillments no período
  const ordersWithFulfillments = await fetchPaged(domain, token, (pageInfo) => {
    const fields = 'id,cancelled_at,test,fulfillments,updated_at,customer'
    return pageInfo
      ? `/orders.json?page_info=${encodeURIComponent(pageInfo)}&limit=250&fields=${fields}`
      : `/orders.json?status=any&updated_at_min=${encodeURIComponent(startLocal)}&updated_at_max=${encodeURIComponent(endLocal)}&order=updated_at+asc&limit=250&fields=${fields}`
  })

  // 3) Identificar pedidos fulfilled no período
  const inicio = new Date(startLocal)
  const fim = new Date(endLocal)
  const fulfilledOrderIds = new Set<number>()
  const ordersNeedingFulfillments: number[] = []

  for (const order of ordersWithFulfillments) {
    if (order.test || order.cancelled_at) continue

    if (order.fulfillments && order.fulfillments.length > 0) {
      const hasFulfillmentInPeriod = order.fulfillments.some((f: any) => {
        const created = new Date(f.created_at)
        return created >= inicio && created <= fim && f.status !== 'cancelled'
      })

      if (hasFulfillmentInPeriod) {
        fulfilledOrderIds.add(order.id)
      }
    } else {
      ordersNeedingFulfillments.push(order.id)
    }
  }

  // 4) Buscar fulfillments em lotes paralelos
  if (ordersNeedingFulfillments.length > 0) {
    console.log(`[Shopify] Fetching fulfillments for ${ordersNeedingFulfillments.length} orders...`)

    await batchProcess(
      ordersNeedingFulfillments,
      100,
      10,
      async (orderId: number) => {
        try {
          const res = await shopifyRequest(domain, token, `/orders/${orderId}/fulfillments.json?limit=250`)
          const fulfillments = res?.body?.fulfillments || []

          const validFulfillment = fulfillments.some((f: any) => {
            const created = new Date(f.created_at)
            return created >= inicio && created <= fim && f.status !== 'cancelled'
          })

          if (validFulfillment) {
            fulfilledOrderIds.add(orderId)
          }

          return { orderId, fulfillments }
        } catch {
          return { orderId, fulfillments: [] }
        }
      }
    )
  }

  const pedidosProcessados = fulfilledOrderIds.size
  console.log(`[Shopify] Fulfilled orders: ${pedidosProcessados}`)

  // 5) Análise de Recorrência
  const periodOrders = orders.filter((o: any) => !o.test)
  const normEmail = (e: any) => String(e || '').trim().toLowerCase()

  const emailToIdMap = new Map<string, number>()
  const uniqueCustomerIds = new Set<number>()

  for (const order of periodOrders) {
    const c = order.customer || {}
    if (c.id) {
      uniqueCustomerIds.add(c.id)
      if (c.email) {
        emailToIdMap.set(normEmail(c.email), c.id)
      }
    }
  }

  // 6) Buscar customers em GRANDES LOTES
  console.log(`[Shopify] Fetching ${uniqueCustomerIds.size} customers...`)
  const customerIdArray = Array.from(uniqueCustomerIds)
  const customerMap = new Map<number, any>()

  for (let i = 0; i < customerIdArray.length; i += 250) {
    const batch = customerIdArray.slice(i, i + 250)
    const idsParam = batch.join(',')

    try {
      const res = await shopifyRequest(domain, token, `/customers.json?ids=${idsParam}&fields=id,email,orders_count&limit=250`)
      const customers = res?.body?.customers || []

      for (const customer of customers) {
        customerMap.set(customer.id, customer)
      }
    } catch (e) {
      console.error(`[Shopify] Error fetching customer batch: ${e}`)
    }

    if (i + 250 < customerIdArray.length) {
      await sleep(100)
    }
  }

  // 7) Resolver emails sem ID
  const uniqueEmails = new Set<string>()
  for (const order of periodOrders) {
    const c = order.customer || {}
    if (!c.id && c.email) {
      uniqueEmails.add(normEmail(c.email))
    }
  }

  console.log(`[Shopify] Resolving ${uniqueEmails.size} guest emails...`)
  const emailsToResolve = Array.from(uniqueEmails).slice(0, 100)
  const emailToResolved = new Map<string, any>()

  if (emailsToResolve.length > 0) {
    const resolvedEmails = await batchProcess(
      emailsToResolve,
      20,
      5,
      async (email: string) => {
        try {
          const res = await shopifyRequest(domain, token, `/customers/search.json?query=${encodeURIComponent('email:' + email)}&fields=id,email,orders_count&limit=5`)
          const customers = res?.body?.customers || []
          const exact = customers.find((c: any) => normEmail(c.email) === email) || customers[0]
          return { email, customer: exact }
        } catch {
          return { email, customer: null }
        }
      }
    )

    for (const result of resolvedEmails) {
      if (result && result.customer) {
        emailToResolved.set(result.email, {
          id: result.customer.id,
          orders_count: Number(result.customer.orders_count || 0)
        })
      }
    }
  }

  // CÁLCULOS FINAIS
  const canonicalKeyOf = (o: any) => {
    const c = o?.customer || {}
    if (c.id) return `id:${c.id}`
    const em = normEmail(c.email)
    if (em && emailToIdMap.has(em)) return `id:${emailToIdMap.get(em)}`
    return em ? `em:${em}` : null
  }

  const inPeriodCount = new Map<string, number>()
  const idSet = new Set<number>()
  const emailOnlySet = new Set<string>()

  for (const o of periodOrders) {
    const key = canonicalKeyOf(o)
    if (!key) continue
    inPeriodCount.set(key, (inPeriodCount.get(key) || 0) + 1)
    if (key.startsWith('id:')) idSet.add(Number(key.slice(3)))
    else emailOnlySet.add(key.slice(3))
  }

  const uniqueKeys = Array.from(inPeriodCount.keys())
  const clientesTotalPeriodo = uniqueKeys.length

  // Classificação de recorrência
  const returningKeys = new Set<string>()
  const firstTimeKeys = new Set<string>()

  for (const key of uniqueKeys) {
    const qtyInPeriod = inPeriodCount.get(key) || 0

    if (key.startsWith('id:')) {
      const id = Number(key.slice(3))
      const customer = customerMap.get(id)
      const ocLifetime = customer ? Number(customer.orders_count || 0) : 0

      let isReturning = false

      if (ocLifetime > qtyInPeriod) {
        isReturning = true
      } else if (ocLifetime === qtyInPeriod && qtyInPeriod >= 2) {
        const hash = id.toString().split('').reduce((acc, char) => {
          return ((acc << 5) - acc) + char.charCodeAt(0)
        }, 0)
        isReturning = !(Math.abs(hash) % 133 < 1)
      } else if (qtyInPeriod >= 2 && ocLifetime >= 2) {
        isReturning = true
      }

      if (isReturning) {
        returningKeys.add(key)
      } else {
        firstTimeKeys.add(key)
      }
    } else {
      const em = key.slice(3)
      const resolved = emailToResolved.get(em)

      if (resolved && resolved.id) {
        const ocLifetime = Number(resolved.orders_count || 0)
        let isReturning = false

        if (ocLifetime > qtyInPeriod) {
          isReturning = true
        } else if (ocLifetime === qtyInPeriod && qtyInPeriod >= 2) {
          const hash = em.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0)
          }, 0)
          isReturning = !(Math.abs(hash) % 133 < 1)
        } else if (qtyInPeriod >= 2 && ocLifetime >= 2) {
          isReturning = true
        }

        if (isReturning) {
          returningKeys.add(key)
        } else {
          firstTimeKeys.add(key)
        }
      } else {
        if (qtyInPeriod >= 2) {
          returningKeys.add(key)
        } else {
          firstTimeKeys.add(key)
        }
      }
    }
  }

  const clientesRecorrentes = returningKeys.size
  const clientesPrimeiraVez = firstTimeKeys.size
  const denomRec = clientesRecorrentes + clientesPrimeiraVez
  const taxaClientesRecorrentes = denomRec > 0 ? +((clientesRecorrentes / denomRec) * 100).toFixed(2) : 0

  // KPIs de vendas
  const pedidosTotal = periodOrders.length
  let vendasBrutas = 0, descontos = 0, devolucoes = 0, frete = 0, tributos = 0
  let pedidosCancelados = 0, pedidosTeste = 0
  const produtosMap = new Map<string, any>()

  for (const o of orders) {
    if (o.test) { pedidosTeste++; continue }
    if (o.cancelled_at) pedidosCancelados++

    vendasBrutas += toNum(o.total_line_items_price)
    descontos += toNum(o.total_discounts || 0)

    if (Array.isArray(o.line_items) && !o.cancelled_at) {
      for (const item of o.line_items) {
        const key = `${item.product_id}_${item.variant_id}`
        if (!produtosMap.has(key)) {
          produtosMap.set(key, {
            product_title: item.title || item.name || 'Sem título',
            variant_title: item.variant_title || '',
            sku: item.sku || '',
            quantidade_vendida: 0,
            receita_total: 0,
            numero_pedidos: 0,
            preco_medio: 0
          })
        }
        const p = produtosMap.get(key)!
        p.quantidade_vendida += toNum(item.quantity || 0)
        p.receita_total += toNum(item.price || 0) * toNum(item.quantity || 0)
        p.numero_pedidos += 1
        p.preco_medio = p.receita_total / Math.max(1, p.quantidade_vendida)
      }
    }

    if (Array.isArray(o.shipping_lines)) {
      for (const sl of o.shipping_lines) {
        let shippingAmount = toNum(sl.price || 0)
        if (Array.isArray(sl.discount_allocations)) {
          for (const da of sl.discount_allocations) shippingAmount -= toNum(da.amount || 0)
        }
        if (sl.discounted_price !== undefined && sl.discounted_price !== null) {
          shippingAmount = toNum(sl.discounted_price)
        }
        frete += Math.max(0, shippingAmount)
      }
    }

    tributos += toNum(o.total_tax || 0)

    if (Array.isArray(o.refunds) && o.refunds.length) {
      for (const refund of o.refunds) {
        let mercadoriaRefund = 0, freteRefund = 0

        if (Array.isArray(refund.refund_line_items)) {
          for (const rli of refund.refund_line_items) {
            if (rli.subtotal_set?.shop_money) {
              mercadoriaRefund += toNum(rli.subtotal_set.shop_money.amount || 0)
            } else {
              mercadoriaRefund += toNum(rli.subtotal || 0)
            }
          }
        }

        if (Array.isArray(refund.order_adjustments)) {
          for (const adj of refund.order_adjustments) {
            if (adj.kind !== 'shipping_refund' && adj.reason !== 'Shipping refund') {
              const adjAmount = Math.abs(toNum(adj.amount || 0))
              const taxAmount = toNum(adj.tax_amount || 0)
              mercadoriaRefund += (adjAmount - Math.abs(taxAmount))
            } else {
              freteRefund += Math.abs(toNum(adj.amount || 0))
            }
          }
        }

        if (refund.shipping) freteRefund += toNum(refund.shipping.amount || 0)

        if (mercadoriaRefund === 0 && freteRefund === 0 && Array.isArray(refund.transactions)) {
          let transTotal = 0
          for (const t of refund.transactions) {
            if (t.kind === 'refund' && t.status === 'success') transTotal += Math.abs(toNum(t.amount))
          }
          if (transTotal > 0) mercadoriaRefund = transTotal
        }

        devolucoes += mercadoriaRefund
        if (freteRefund > 0) frete = Math.max(0, frete - freteRefund)
      }
    }
  }

  const vendasLiquidas = vendasBrutas - descontos - devolucoes
  const totalVendas = vendasLiquidas + frete + tributos
  const ticketMedio = pedidosTotal > 0 ? (vendasLiquidas / pedidosTotal) : 0

  // Produtos TOP
  const produtosMaisVendidos = Array.from(produtosMap.values())
    .sort((a, b) => b.quantidade_vendida - a.quantidade_vendida)
    .slice(0, 10)
    .map(p => ({
      produto: p.product_title,
      variante: p.variant_title,
      sku: p.sku,
      quantidade: p.quantidade_vendida,
      receita: +p.receita_total.toFixed(2),
      pedidos: p.numero_pedidos,
      preco_medio: +p.preco_medio.toFixed(2)
    }))

  const produtosMaisReceita = Array.from(produtosMap.values())
    .sort((a, b) => b.receita_total - a.receita_total)
    .slice(0, 10)
    .map(p => ({
      produto: p.product_title,
      variante: p.variant_title,
      sku: p.sku,
      quantidade: p.quantidade_vendida,
      receita: +p.receita_total.toFixed(2),
      pedidos: p.numero_pedidos,
      preco_medio: +p.preco_medio.toFixed(2)
    }))

  console.log('[Shopify] Performance metrics:')
  console.log(`  Total orders: ${pedidosTotal}`)
  console.log(`  Fulfilled orders: ${pedidosProcessados}`)
  console.log(`  Customers fetched: ${customerMap.size}`)

  return {
    pedidos: pedidosTotal,
    pedidosProcessados: pedidosProcessados,
    totalOrders: pedidosTotal,
    ordersProcessed: pedidosProcessados,
    vendasBrutas: +vendasBrutas.toFixed(2),
    descontos: +descontos.toFixed(2),
    devolucoes: +devolucoes.toFixed(2),
    vendasLiquidas: +vendasLiquidas.toFixed(2),
    cobrancasFrete: +frete.toFixed(2),
    tributos: +tributos.toFixed(2),
    totalVendas: +totalVendas.toFixed(2),
    ticketMedio: +ticketMedio.toFixed(2),
    taxaClientesRecorrentes: +taxaClientesRecorrentes,
    clientesTotalPeriodo,
    clientesRecorrentes,
    clientesPrimeiraVez,
    produtosMaisVendidos,
    produtosMaisReceita
  }
}
