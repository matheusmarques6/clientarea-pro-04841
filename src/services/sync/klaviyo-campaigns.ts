// ============================================================================
// KLAVIYO CAMPAIGNS SYNC SERVICE
// Adaptado do script n8n para rodar no frontend
// ============================================================================

interface Campaign {
  id: string
  nome: string
  status: string
  data_envio: string
  receita: number
  conversoes: number
}

interface KlaviyoCampaignsResult {
  campanhas: Campaign[]
  metricaId: string
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

export async function fetchKlaviyoCampaigns(
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<KlaviyoCampaignsResult> {

  // BUSCAR MÉTRICA
  console.log('[Klaviyo] Searching for Placed Order metric...')
  const metricsRes = await klaviyoRequest(apiKey, 'GET', '/metrics')
  let metricaId: string | null = null

  if (metricsRes.success) {
    const metrics = metricsRes.data?.data || []
    const placedOrders = metrics.filter((m: any) => m.attributes?.name === 'Placed Order')

    if (placedOrders.length === 1) {
      metricaId = placedOrders[0].id
      console.log(`[Klaviyo] Found metric: ${placedOrders[0].attributes.name} (${metricaId})`)
    } else if (placedOrders.length > 1) {
      // Testar qual métrica tem dados
      const testes = await execQueue(placedOrders.slice(0, 3), 3, async (metric: any) => {
        const testBody = {
          data: {
            type: 'flow-values-report',
            attributes: {
              timeframe: {
                start: startDate + 'T00:00:00Z',
                end: endDate + 'T23:59:59Z'
              },
              conversion_metric_id: metric.id,
              statistics: ['conversion_value']
            }
          }
        }
        const testRes = await klaviyoRequest(apiKey, 'POST', '/flow-values-reports/', '', testBody)
        let total = 0
        if (testRes.success) {
          const results = testRes.data?.data?.attributes?.results || []
          total = results.reduce((sum: number, r: any) => sum + (r.statistics?.conversion_value || 0), 0)
        }
        return { metric, total }
      })

      let metricaEscolhida = null
      let maiorReceita = 0
      for (const t of testes) {
        if (t.total > maiorReceita) {
          maiorReceita = t.total
          metricaEscolhida = t.metric
        }
      }
      if (metricaEscolhida) {
        metricaId = metricaEscolhida.id
        console.log(`[Klaviyo] Selected metric with highest revenue: ${metricaId}`)
      }
    }
  }

  if (!metricaId) {
    metricaId = 'W8Gk3c' // Fallback default
    console.log('[Klaviyo] Using default metric ID: W8Gk3c')
  }

  // CAMPANHAS - FETCH ALL EMAIL CAMPAIGNS
  console.log('[Klaviyo] Fetching email campaigns...')
  const campanhasRes = await klaviyoRequest(apiKey, 'GET', '/campaigns', 'filter=equals(messages.channel,"email")')
  const campanhas: Campaign[] = []

  if (campanhasRes.success && campanhasRes.data?.data) {
    const todasCampanhas = campanhasRes.data.data
    console.log(`[Klaviyo] Total campaigns found: ${todasCampanhas.length}`)

    const inicio = new Date(startDate)
    const fim = new Date(endDate)
    fim.setHours(23, 59, 59, 999)

    // Filtrar campanhas por send_time
    const campanhasDoPeriodo = todasCampanhas.filter((camp: any) => {
      const sendTime = camp.attributes?.send_time
      if (!sendTime) return false
      const dataCamp = new Date(sendTime)
      return dataCamp >= inicio && dataCamp <= fim
    })

    console.log(`[Klaviyo] Campaigns in period: ${campanhasDoPeriodo.length}`)

    const baseCampanhas = campanhasDoPeriodo.map((camp: any) => ({
      id: camp.id,
      nome: camp.attributes?.name,
      status: camp.attributes?.status,
      data_envio: camp.attributes?.send_time,
      receita: 0,
      conversoes: 0
    }))

    // Buscar receita de cada campanha
    if (metricaId && baseCampanhas.length > 0) {
      console.log('[Klaviyo] Fetching campaign metrics...')
      const relatorios = await execQueue(baseCampanhas, 3, async (campanhaData: Campaign) => {
        const valuesBody = {
          data: {
            type: 'campaign-values-report',
            attributes: {
              timeframe: {
                start: startDate + 'T00:00:00Z',
                end: endDate + 'T23:59:59Z'
              },
              conversion_metric_id: metricaId,
              filter: `equals(campaign_id,"${campanhaData.id}")`,
              statistics: ['conversion_value', 'conversions']
            }
          }
        }
        const valuesRes = await klaviyoRequest(apiKey, 'POST', '/campaign-values-reports/', '', valuesBody)
        if (valuesRes.success && valuesRes.data?.data?.attributes?.results?.[0]) {
          const stats = valuesRes.data.data.attributes.results[0].statistics || {}
          campanhaData.receita = stats.conversion_value || 0
          campanhaData.conversoes = stats.conversions || 0
        }
        return campanhaData
      })
      campanhas.push(...relatorios)
    } else {
      campanhas.push(...baseCampanhas)
    }
  }

  console.log(`[Klaviyo] Processed campaigns: ${campanhas.length}`)
  console.log(`[Klaviyo] Metric ID: ${metricaId}`)

  return {
    campanhas,
    metricaId
  }
}
