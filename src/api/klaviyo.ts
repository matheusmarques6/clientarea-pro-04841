export interface KlaviyoWebhookResponse {
  klaviyo: {
    revenue_total: number;
    revenue_campaigns: number;
    revenue_flows: number;
    orders_attributed: number;
    conversions_campaigns: number;
    conversions_flows: number;
    top_campaigns_by_revenue: Campaign[];
    top_campaigns_by_conversions: Campaign[];
    top_flows_by_revenue: Flow[];
    top_flows_by_performance: Flow[];
    leads_total: string | number;
    campaign_count: number;
    flow_count: number;
    campaigns_with_revenue: number;
    flows_with_revenue: number;
    flows_with_activity: number;
    flow_performance_averages: {
      avg_open_rate: number;
      avg_click_rate: number;
      total_flow_deliveries: number;
      total_flow_opens: number;
      total_flow_clicks: number;
    };
    flows_detailed: FlowDetailed[];
  };
  period: { start: string; end: string };
  store: { id: string; domain: string };
  metadata: {
    metric_id: string;
    request_id: string;
    timestamp: string;
    version: string;
  };
  status: string;
  summary: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    campaign_performance: {
      sent: number;
      with_revenue: number;
      revenue_percentage: number;
    };
    flow_performance: {
      active: number;
      with_revenue: number;
      with_activity: number;
      revenue_percentage: number;
      avg_open_rate: number;
      avg_click_rate: number;
    };
  };
  debug: {
    campaigns_found: number;
    flows_found: number;
    flows_with_revenue: number;
    flows_with_performance: number;
    metric_id_used: string;
    dates_processed: {
      start: string;
      end: string;
    };
  };
}

export interface Campaign {
  id: string;
  name: string;
  revenue: number;
  conversions: number;
  send_time?: string;
  status?: string | null;
}

export interface Flow {
  id: string;
  name: string;
  revenue: number;
  conversions: number;
  performance?: {
    open_rate: number;
    click_rate: number;
    conversion_rate: number;
  };
}

export interface FlowDetailed extends Flow {
  status: string;
  ticket_medio: number;
  performance: {
    opens: number;
    opens_unique: number;
    clicks: number;
    clicks_unique: number;
    deliveries: number;
    bounces: number;
    unsubscribes: number;
    open_rate: number;
    click_rate: number;
    conversion_rate: number;
  };
}

// Legacy type for backward compatibility
export type KlaviyoSummary = {
  klaviyo: {
    revenue_total: number;
    revenue_campaigns: number;
    revenue_flows: number;
    orders_attributed: number;
    top_campaigns_by_revenue: Campaign[];
    top_campaigns_by_conversions: Campaign[];
    leads_total: number;
  };
  period: { start: string; end: string };
  store: { id: string };
};

// Use syncKlaviyo from lib/syncKlaviyo.ts instead of direct n8n calls
// This properly calls the Supabase edge function klaviyo_summary with auth headers