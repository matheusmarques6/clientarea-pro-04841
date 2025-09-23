import { supabase } from '@/integrations/supabase/client';

const fetchWithTimeout = <T,>(p: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });

export async function syncKlaviyo({ storeId, from, to, fast = true }: { storeId: string, from: string, to: string, fast?: boolean }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No auth token');

  const url = `https://bsotblbtrshqfiqyzisy.supabase.co/functions/v1/klaviyo_summary`;
  const body = JSON.stringify({ storeId, from, to, fast });

  const req = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    return r.json();
  });

  // 20s limite no front — se estourar, usa cache e segue a vida
  try {
    return await fetchWithTimeout(req, 20000);
  } catch {
    console.warn('Klaviyo Edge timeout — using cached summary');
    const { data } = await supabase
      .from('klaviyo_summaries')
      .select('*')
      .eq('store_id', storeId)
      .eq('period_start', from)
      .eq('period_end', to)
      .maybeSingle();
    return data ? {
      klaviyo: {
        revenue_total: data.revenue_total ?? 0,
        revenue_campaigns: data.revenue_campaigns ?? 0,
        revenue_flows: data.revenue_flows ?? 0,
        orders_attributed: data.orders_attributed ?? 0,
        top_campaigns_by_revenue: data.top_campaigns_by_revenue ?? [],
        top_campaigns_by_conversions: data.top_campaigns_by_conversions ?? [],
        leads_total: data.leads_total ?? 0
      },
      period: { start: from, end: to },
      store: { id: storeId },
      status: 'CACHE_FALLBACK'
    } : null;
  }
}