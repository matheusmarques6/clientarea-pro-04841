export type KlaviyoSummary = {
  klaviyo: {
    revenue_total: number;
    revenue_campaigns: number;
    revenue_flows: number;
    orders_attributed: number;
    top_campaigns_by_revenue: { id: string; name: string; revenue: number; conversions: number; send_time?: string; status?: string | null }[];
    top_campaigns_by_conversions: { id: string; name: string; revenue: number; conversions: number; send_time?: string; status?: string | null }[];
    leads_total: number;
  };
  period: { start: string; end: string };
  store: { id: string };
};

async function fetchJsonSafe(url: string, init?: RequestInit) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await resp.text();
  const data = text ? JSON.parse(text) : {};
  if (!resp.ok) {
    const msg = data?.error || data?.message || `HTTP ${resp.status}`;
    const hint = data?.hint ? ` — ${data.hint}` : '';
    throw new Error(msg + hint);
  }
  return data as KlaviyoSummary;
}

export async function getKlaviyoSummary(storeId: string, fromISO: string, toISO: string) {
  const url = 'https://n8n-n8n.1fpac5.easypanel.host/webhook/klaviyo/summary';
  if (!url) throw new Error('N8N URL ausente (NEXT_PUBLIC_N8N_KLAVIYO_URL)');

  const headers: Record<string, string> = {};
  // Opcional: se precisar de API key no futuro
  // const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY;
  // if (apiKey) headers['x-api-key'] = apiKey;

  return fetchJsonSafe(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ storeId, from: fromISO, to: toISO }),
  });
}