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

// Use syncKlaviyo from lib/syncKlaviyo.ts instead of direct n8n calls
// This properly calls the Supabase edge function klaviyo_summary with auth headers