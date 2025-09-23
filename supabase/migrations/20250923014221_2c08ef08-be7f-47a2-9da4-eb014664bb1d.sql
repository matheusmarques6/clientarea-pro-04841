-- Tabela para cache/fallback do Klaviyo
CREATE TABLE IF NOT EXISTS public.klaviyo_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue_total NUMERIC NOT NULL DEFAULT 0,
  revenue_campaigns NUMERIC NOT NULL DEFAULT 0,
  revenue_flows NUMERIC NOT NULL DEFAULT 0,
  orders_attributed INTEGER NOT NULL DEFAULT 0,
  leads_total INTEGER NOT NULL DEFAULT 0,
  top_campaigns_by_revenue JSONB,
  top_campaigns_by_conversions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (store_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.klaviyo_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policy for klaviyo_summaries
CREATE POLICY "klaviyo_summaries_rw_policy" 
ON public.klaviyo_summaries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() AND store_id = klaviyo_summaries.store_id
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_klaviyo_summaries_store_period ON public.klaviyo_summaries(store_id, period_start, period_end);