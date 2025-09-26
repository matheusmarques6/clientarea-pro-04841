-- Inserir manualmente os dados do webhook
INSERT INTO klaviyo_summaries (
  store_id,
  period_start,
  period_end,
  revenue_total,
  revenue_campaigns,
  revenue_flows,
  orders_attributed,
  conversions_campaigns,
  conversions_flows,
  leads_total,
  campaign_count,
  flow_count,
  campaigns_with_revenue,
  flows_with_revenue,
  flows_with_activity,
  flow_perf,
  top_campaigns_by_revenue,
  top_campaigns_by_conversions,
  raw,
  updated_at
) VALUES (
  'eebbf8b8-0cde-4dc4-9fe9-fc9870af9075',
  '2025-08-27',
  '2025-09-26',
  12897.44,
  1374.44,
  11523,
  151,
  17,
  134,
  1,
  4,
  9,
  2,
  0,
  0,
  '{"avg_open_rate": 0, "avg_click_rate": 0, "total_flow_deliveries": 0, "total_flow_opens": 0, "total_flow_clicks": 0}'::jsonb,
  '[{"id": "01K42TAVGA4PKGM57B1T6ZG4VN", "name": "[02/09] - [10:00] - [TODOS OS LEADS] - [SOFT SELL SETEMBRO] - [INGLÊS]", "revenue": 977.85999, "conversions": 12}, {"id": "01K4JAQ9MVRGNQPMWD1YX47PVZ", "name": "[08/09] - [10:00] - [TODOS OS LEADS] - [CREDITO NA LOJA] - [INGLÊS]", "revenue": 396.58, "conversions": 5}]'::jsonb,
  '[{"id": "01K42TAVGA4PKGM57B1T6ZG4VN", "name": "[02/09] - [10:00] - [TODOS OS LEADS] - [SOFT SELL SETEMBRO] - [INGLÊS]", "revenue": 977.85999, "conversions": 12}, {"id": "01K4JAQ9MVRGNQPMWD1YX47PVZ", "name": "[08/09] - [10:00] - [TODOS OS LEADS] - [CREDITO NA LOJA] - [INGLÊS]", "revenue": 396.58, "conversions": 5}]'::jsonb,
  '{"status": "SUCCESS", "summary": {"total_revenue": 12897.44, "total_orders": 151}}'::jsonb,
  NOW()
)
ON CONFLICT (store_id, period_start, period_end) 
DO UPDATE SET
  revenue_total = EXCLUDED.revenue_total,
  revenue_campaigns = EXCLUDED.revenue_campaigns,
  revenue_flows = EXCLUDED.revenue_flows,
  orders_attributed = EXCLUDED.orders_attributed,
  conversions_campaigns = EXCLUDED.conversions_campaigns,
  conversions_flows = EXCLUDED.conversions_flows,
  leads_total = EXCLUDED.leads_total,
  campaign_count = EXCLUDED.campaign_count,
  flow_count = EXCLUDED.flow_count,
  campaigns_with_revenue = EXCLUDED.campaigns_with_revenue,
  flows_with_revenue = EXCLUDED.flows_with_revenue,
  flows_with_activity = EXCLUDED.flows_with_activity,
  flow_perf = EXCLUDED.flow_perf,
  top_campaigns_by_revenue = EXCLUDED.top_campaigns_by_revenue,
  top_campaigns_by_conversions = EXCLUDED.top_campaigns_by_conversions,
  raw = EXCLUDED.raw,
  updated_at = EXCLUDED.updated_at;

-- Também inserir na channel_revenue
INSERT INTO channel_revenue (
  store_id,
  period_start,
  period_end,
  channel,
  source,
  revenue,
  orders_count,
  currency,
  raw,
  updated_at
) VALUES (
  'eebbf8b8-0cde-4dc4-9fe9-fc9870af9075',
  '2025-08-27',
  '2025-09-26',
  'email',
  'klaviyo_manual',
  12897.44,
  151,
  'BRL',
  '{"klaviyo": {"revenue_total": 12897.44}}'::jsonb,
  NOW()
)
ON CONFLICT (store_id, period_start, period_end, channel, source)
DO UPDATE SET
  revenue = EXCLUDED.revenue,
  orders_count = EXCLUDED.orders_count,
  currency = EXCLUDED.currency,
  raw = EXCLUDED.raw,
  updated_at = EXCLUDED.updated_at;

-- Atualizar o status do job se existir
UPDATE n8n_jobs
SET 
  status = 'SUCCESS',
  finished_at = NOW(),
  payload = '{"klaviyo": {"revenue_total": 12897.44}, "status": "SUCCESS"}'::jsonb
WHERE store_id = 'eebbf8b8-0cde-4dc4-9fe9-fc9870af9075'
  AND period_start = '2025-08-27'
  AND period_end = '2025-09-26'
  AND status = 'PROCESSING';