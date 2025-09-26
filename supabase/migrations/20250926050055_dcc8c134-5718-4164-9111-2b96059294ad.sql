-- Adicionar constraint única na tabela klaviyo_summaries
ALTER TABLE klaviyo_summaries 
ADD CONSTRAINT klaviyo_summaries_unique_period 
UNIQUE (store_id, period_start, period_end);

-- Adicionar constraint única na tabela channel_revenue
ALTER TABLE channel_revenue 
ADD CONSTRAINT channel_revenue_unique_period_channel 
UNIQUE (store_id, period_start, period_end, channel);

-- Verificar se as constraints foram criadas
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE 
    tc.table_schema = 'public'
    AND tc.table_name IN ('klaviyo_summaries', 'channel_revenue')
    AND tc.constraint_type = 'UNIQUE'
ORDER BY 
    tc.table_name, 
    tc.constraint_name;