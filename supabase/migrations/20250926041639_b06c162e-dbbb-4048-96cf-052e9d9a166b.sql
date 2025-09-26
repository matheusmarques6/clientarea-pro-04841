-- Limpar apenas dados de teste do período específico
DELETE FROM klaviyo_summaries 
WHERE store_id = 'eebbf8b8-0cde-4dc4-9fe9-fc9870af9075' 
AND period_start = '2025-08-27' 
AND period_end = '2025-09-26';

DELETE FROM channel_revenue 
WHERE store_id = 'eebbf8b8-0cde-4dc4-9fe9-fc9870af9075' 
AND period_start = '2025-08-27' 
AND period_end = '2025-09-26';