// ============================================================================
// FETCH FLOWS WITH METRICS - OTIMIZADO
// ============================================================================
// Busca flows ativos E suas métricas de receita/conversão
// ============================================================================

const dados = $input.first().json;
const apiKey = dados.privateKey;
const metricaId = dados.metricaId || 'W8Gk3c';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function execQueue(items, limit, worker) {
  const results = new Array(items.length);
  let idx = 0;
  const runners = Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      let current;
      const i = idx;
      if (i >= items.length) break;
      idx++;
      current = items[i];
      results[i] = await worker(current, i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function klaviyoRequest(method, endpoint, queryString = '', body = null) {
  const maxTentativas = 5;
  let tentativa = 0;

  while (true) {
    if (tentativa > 0) {
      const backoff = Math.min(1500 * Math.pow(2, tentativa - 1), 8000);
      await sleep(backoff);
    }

    let url = `https://a.klaviyo.com/api${endpoint}`;
    if (queryString) {
      url += `?${queryString}`;
    }

    const options = {
      method: method,
      uri: url,
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Accept': 'application/json',
        'revision': '2024-10-15',
        'Connection': 'keep-alive'
      },
      json: true,
      forever: true,
      timeout: 30000
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = body;
    }

    try {
      const response = await this.helpers.request(options);
      return { success: true, data: response };
    } catch (error) {
      const status = error?.statusCode || error?.response?.statusCode;
      const retryAfterHeader = error?.response?.headers?.['retry-after'];
      const retryAfterMs = retryAfterHeader ? (Number(retryAfterHeader) * 1000) : null;

      if ((status === 429 || (status >= 500 && status < 600)) && tentativa < maxTentativas) {
        if (retryAfterMs && retryAfterMs > 0) {
          await sleep(retryAfterMs);
        }
        tentativa++;
        continue;
      }
      return { success: false, error: error };
    }
  }
}

const api = klaviyoRequest.bind(this);

// ============================================================================
// FETCH FLOWS
// ============================================================================

console.log('Fetching flows...');
let allFlows = [];
let nextUrl = '/flows?page[size]=50';
let pages = 0;
const maxPages = 20;

while (nextUrl && pages < maxPages) {
  if (pages > 0) await sleep(300);

  const flowsRes = await api('GET', nextUrl);

  if (flowsRes.success && flowsRes.data?.data) {
    allFlows = allFlows.concat(flowsRes.data.data);

    // Get next page cursor
    const nextCursor = flowsRes.data?.links?.next;
    if (nextCursor) {
      // Extract page cursor from URL
      const match = nextCursor.match(/page\[cursor\]=([^&]+)/);
      if (match) {
        nextUrl = `/flows?page[size]=50&page[cursor]=${match[1]}`;
      } else {
        nextUrl = null;
      }
    } else {
      nextUrl = null;
    }
  } else {
    break;
  }

  pages++;
}

console.log(`Total flows found: ${allFlows.length}`);

// Filter active flows
const activeFlows = allFlows.filter(f =>
  f.attributes?.status === 'live' || f.attributes?.status === 'manual'
);

console.log(`Active flows: ${activeFlows.length}`);

const flows = activeFlows.map(f => ({
  id: f.id,
  nome: f.attributes.name || 'Unnamed Flow',
  status: f.attributes.status,
  created: f.attributes?.created,
  updated: f.attributes?.updated,
  receita: 0,
  conversoes: 0
}));

// ============================================================================
// FETCH METRICS FOR FLOWS (PARALELO)
// ============================================================================

if (metricaId && flows.length > 0) {
  console.log('Fetching flow metrics...');

  const flowsWithMetrics = await execQueue(flows, 3, async (flowData) => {
    const valuesBody = {
      data: {
        type: 'flow-values-report',
        attributes: {
          timeframe: {
            start: dados.startDate + 'T00:00:00Z',
            end: dados.endDate + 'T23:59:59Z'
          },
          conversion_metric_id: metricaId,
          filter: `equals(flow_id,"${flowData.id}")`,
          statistics: ['conversion_value', 'conversions']
        }
      }
    };

    const valuesRes = await api('POST', '/flow-values-reports/', '', valuesBody);

    if (valuesRes.success && valuesRes.data?.data?.attributes?.results?.[0]) {
      const stats = valuesRes.data.data.attributes.results[0].statistics || {};
      flowData.receita = stats.conversion_value || 0;
      flowData.conversoes = stats.conversions || 0;
    }

    return flowData;
  });

  console.log(`Processed flows with metrics: ${flowsWithMetrics.length}`);

  // Calculate totals
  const totalRevenue = flowsWithMetrics.reduce((sum, f) => sum + f.receita, 0);
  const totalConversions = flowsWithMetrics.reduce((sum, f) => sum + f.conversoes, 0);

  console.log(`Total flow revenue: ${totalRevenue}`);
  console.log(`Total flow conversions: ${totalConversions}`);

  return [{
    json: {
      flows: flowsWithMetrics,
      metricaId,
      ...dados
    }
  }];
}

return [{
  json: {
    flows,
    metricaId,
    ...dados
  }
}];
