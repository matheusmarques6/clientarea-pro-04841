-- Adicionar constraint única para klaviyo_summaries
ALTER TABLE klaviyo_summaries 
ADD CONSTRAINT klaviyo_summaries_unique 
UNIQUE (store_id, period_start, period_end);

-- Adicionar constraint única para channel_revenue se não existir
ALTER TABLE channel_revenue
ADD CONSTRAINT channel_revenue_unique 
UNIQUE (store_id, period_start, period_end, channel, source);