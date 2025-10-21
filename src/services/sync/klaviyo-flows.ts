// ============================================================================
// KLAVIYO FLOWS SYNC SERVICE
// Adaptado do script n8n para rodar no frontend
// ============================================================================

interface Flow {
  id: string
  nome: string
  status: string
  created?: string
  updated?: string
  receita: number
  conversoes: number
}

interface KlaviyoFlowsResult {
  flows: Flow[]
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function execQueue<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0

  const runners = Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const i = idx
        if (i >= items.length) break
        idx++
        results[i] = await worker(items[i], i)
      }
    })

  await Promise.all(runners)
  return results
}

async function klaviyoRequest(
  apiKey: string,
  method: string,
  endpoint: string,
  queryString = '',
  body: any = null
) {
  const maxTentativas = 5
  let tentativa = 0

  while (true) {
    if (tentativa > 0) {
      const backoff = Math.min(1500 * Math.pow(2, tentativa - 1), 8000)
      await sleep(backoff)
    }

    let url = `https://a.klaviyo.com/api${endpoint}`
    if (queryString) {
      url += `?${queryString}`
    }

    const options: RequestInit = {
      method: method,
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Accept': 'application/json',
        'revision': '2024-10-15'
      }
    }

    if (body) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
      }
      options.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        const status = response.status
        const retryAfterHeader = response.headers.get('retry-after')
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null

        if ((status === 429 || (status >= 500 && status < 600)) && tentativa < maxTentativas) {
          if (retryAfterMs && retryAfterMs > 0) {
            await sleep(retryAfterMs)
          }
          tentativa++
          continue
        }

        throw new Error(`Klaviyo API error: ${status}`)
      }

      const data = await response.json()
      return { success: true, data }

    } catch (error: any) {
      if (tentativa < maxTentativas) {
        tentativa++
        continue
      }
      return { success: false, error }
    }
  }
}

export async function fetchKlaviyoFlows(
  apiKey: string,
  metricaId: string,
  startDate: string,
  endDate: string
): Promise<KlaviyoFlowsResult> {

  // FETCH FLOWS COM PAGINAÇÃO
  console.log('[Klaviyo] Fetching flows...')
  let allFlows: any[] = []
  let nextUrl: string | null = '/flows?page[size]=50'
  let pages = 0
  const maxPages = 20

  while (nextUrl && pages < maxPages) {
    if (pages > 0) await sleep(300)

    const flowsRes = await klaviyoRequest(apiKey, 'GET', nextUrl)

    if (flowsRes.success && flowsRes.data?.data) {
      allFlows = allFlows.concat(flowsRes.data.data)

      // Get next page cursor
      const nextCursor = flowsRes.data?.links?.next
      if (nextCursor) {
        // Extract page cursor from URL
        const match = nextCursor.match(/page\[cursor\]=([^&]+)/)
        if (match) {
          nextUrl = `/flows?page[size]=50&page[cursor]=${match[1]}`
        } else {
          nextUrl = null
        }
      } else {
        nextUrl = null
      }
    } else {
      break
    }

    pages++
  }

  console.log(`[Klaviyo] Total flows found: ${allFlows.length}`)

  // Filtrar flows ativos
  const activeFlows = allFlows.filter((f: any) =>
    f.attributes?.status === 'live' || f.attributes?.status === 'manual'
  )

  console.log(`[Klaviyo] Active flows: ${activeFlows.length}`)

  const flows: Flow[] = activeFlows.map((f: any) => ({
    id: f.id,
    nome: f.attributes.name || 'Unnamed Flow',
    status: f.attributes.status,
    created: f.attributes?.created,
    updated: f.attributes?.updated,
    receita: 0,
    conversoes: 0
  }))

  // FETCH METRICS FOR FLOWS (PARALELO)
  if (metricaId && flows.length > 0) {
    console.log('[Klaviyo] Fetching flow metrics...')

    const flowsWithMetrics = await execQueue(flows, 3, async (flowData: Flow) => {
      const valuesBody = {
        data: {
          type: 'flow-values-report',
          attributes: {
            timeframe: {
              start: startDate + 'T00:00:00Z',
              end: endDate + 'T23:59:59Z'
            },
            conversion_metric_id: metricaId,
            filter: `equals(flow_id,"${flowData.id}")`,
            statistics: ['conversion_value', 'conversions']
          }
        }
      }

      const valuesRes = await klaviyoRequest(apiKey, 'POST', '/flow-values-reports/', '', valuesBody)

      if (valuesRes.success && valuesRes.data?.data?.attributes?.results?.[0]) {
        const stats = valuesRes.data.data.attributes.results[0].statistics || {}
        flowData.receita = stats.conversion_value || 0
        flowData.conversoes = stats.conversions || 0
      }

      return flowData
    })

    console.log(`[Klaviyo] Processed flows with metrics: ${flowsWithMetrics.length}`)

    // Calcular totais
    const totalRevenue = flowsWithMetrics.reduce((sum, f) => sum + f.receita, 0)
    const totalConversions = flowsWithMetrics.reduce((sum, f) => sum + f.conversoes, 0)

    console.log(`[Klaviyo] Total flow revenue: ${totalRevenue}`)
    console.log(`[Klaviyo] Total flow conversions: ${totalConversions}`)

    return { flows: flowsWithMetrics }
  }

  return { flows }
}
