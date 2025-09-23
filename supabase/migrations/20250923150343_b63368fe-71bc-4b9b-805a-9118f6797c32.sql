-- Criar tabela klaviyo_summaries para cache (se não existir)
CREATE TABLE IF NOT EXISTS public.klaviyo_summaries (
  store_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  revenue_total numeric NOT NULL DEFAULT 0,
  revenue_campaigns numeric NOT NULL DEFAULT 0,
  revenue_flows numeric NOT NULL DEFAULT 0,
  orders_attributed integer NOT NULL DEFAULT 0,
  leads_total integer NOT NULL DEFAULT 0,
  top_campaigns_by_revenue jsonb NOT NULL DEFAULT '[]',
  top_campaigns_by_conversions jsonb NOT NULL DEFAULT '[]',
  top_flows_by_revenue jsonb NOT NULL DEFAULT '[]',
  top_flows_by_performance jsonb NOT NULL DEFAULT '[]',
  flows_detailed jsonb NOT NULL DEFAULT '[]',
  flow_performance_averages jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT klaviyo_summaries_pk PRIMARY KEY (store_id, period_start, period_end)
);

-- Enable RLS on klaviyo_summaries
ALTER TABLE public.klaviyo_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for klaviyo_summaries
CREATE POLICY "klaviyo_summaries_rw_policy" 
ON public.klaviyo_summaries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = klaviyo_summaries.store_id
  )
);