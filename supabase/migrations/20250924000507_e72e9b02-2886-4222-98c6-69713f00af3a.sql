-- Create n8n_jobs table for tracking sync jobs
CREATE TABLE IF NOT EXISTS public.n8n_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  request_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED','PROCESSING','SUCCESS','ERROR','TIMEOUT')),
  source TEXT NOT NULL DEFAULT 'klaviyo',
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error TEXT,
  payload JSONB,
  meta JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key references
ALTER TABLE public.n8n_jobs 
ADD CONSTRAINT n8n_jobs_store_id_fkey 
FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS n8n_jobs_store_period_idx
  ON public.n8n_jobs(store_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS n8n_jobs_request_id_idx
  ON public.n8n_jobs(request_id);

CREATE INDEX IF NOT EXISTS n8n_jobs_status_idx
  ON public.n8n_jobs(status);

-- Enable RLS
ALTER TABLE public.n8n_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for n8n_jobs
CREATE POLICY "Users can read their store jobs"
ON public.n8n_jobs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM v_user_stores vus 
  WHERE vus.store_id = n8n_jobs.store_id AND vus.user_id = auth.uid()
));

CREATE POLICY "Users can insert jobs for their stores"
ON public.n8n_jobs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM v_user_stores vus 
  WHERE vus.store_id = n8n_jobs.store_id AND vus.user_id = auth.uid()
));

CREATE POLICY "Users can update their store jobs"
ON public.n8n_jobs FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM v_user_stores vus 
  WHERE vus.store_id = n8n_jobs.store_id AND vus.user_id = auth.uid()
));

-- Update klaviyo_summaries table structure
ALTER TABLE public.klaviyo_summaries 
ADD COLUMN IF NOT EXISTS conversions_campaigns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversions_flows INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS campaign_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flow_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS campaigns_with_revenue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flows_with_revenue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flows_with_activity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flow_perf JSONB,
ADD COLUMN IF NOT EXISTS raw JSONB;

-- Add unique constraint for period-based summaries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'klaviyo_summaries_store_period_unique'
    ) THEN
        ALTER TABLE public.klaviyo_summaries 
        ADD CONSTRAINT klaviyo_summaries_store_period_unique 
        UNIQUE (store_id, period_start, period_end);
    END IF;
END $$;