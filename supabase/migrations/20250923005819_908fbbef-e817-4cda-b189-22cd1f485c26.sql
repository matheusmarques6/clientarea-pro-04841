-- Inserir dados de exemplo para testar o dashboard

-- Limpar dados existentes para a loja de teste
DELETE FROM channel_revenue WHERE store_id = 'cc232dc0-7ddc-4260-882b-919d062fb42c';
DELETE FROM orders WHERE store_id = 'cc232dc0-7ddc-4260-882b-919d062fb42c';

-- Inserir pedidos de exemplo dos últimos 30 dias
INSERT INTO orders (store_id, shopify_id, code, total, currency, created_at, status) VALUES
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1001, 'ORD-1001', 450.00, 'BRL', NOW() - INTERVAL '1 day', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1002, 'ORD-1002', 780.50, 'BRL', NOW() - INTERVAL '2 days', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1003, 'ORD-1003', 320.00, 'BRL', NOW() - INTERVAL '3 days', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1004, 'ORD-1004', 650.75, 'BRL', NOW() - INTERVAL '5 days', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1005, 'ORD-1005', 890.25, 'BRL', NOW() - INTERVAL '7 days', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1006, 'ORD-1006', 234.80, 'BRL', NOW() - INTERVAL '10 days', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1007, 'ORD-1007', 567.40, 'BRL', NOW() - INTERVAL '15 days', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1008, 'ORD-1008', 1200.00, 'BRL', NOW() - INTERVAL '20 days', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1009, 'ORD-1009', 345.60, 'BRL', NOW() - INTERVAL '25 days', 'paid'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 1010, 'ORD-1010', 456.30, 'BRL', NOW() - INTERVAL '28 days', 'paid');

-- Inserir receita de email de exemplo
INSERT INTO channel_revenue (store_id, channel, source, period_start, period_end, revenue, currency) VALUES
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'email', 'campaign', (NOW() - INTERVAL '7 days')::date, NOW()::date, 850.00, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'email', 'flow', (NOW() - INTERVAL '7 days')::date, NOW()::date, 420.50, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'email', 'campaign', (NOW() - INTERVAL '14 days')::date, (NOW() - INTERVAL '7 days')::date, 680.75, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'email', 'flow', (NOW() - INTERVAL '14 days')::date, (NOW() - INTERVAL '7 days')::date, 320.25, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'email', 'campaign', (NOW() - INTERVAL '21 days')::date, (NOW() - INTERVAL '14 days')::date, 750.40, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'email', 'flow', (NOW() - INTERVAL '21 days')::date, (NOW() - INTERVAL '14 days')::date, 380.60, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'email', 'campaign', (NOW() - INTERVAL '30 days')::date, (NOW() - INTERVAL '21 days')::date, 920.80, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'email', 'flow', (NOW() - INTERVAL '30 days')::date, (NOW() - INTERVAL '21 days')::date, 445.20, 'BRL');

-- Inserir receita de SMS de exemplo
INSERT INTO channel_revenue (store_id, channel, source, period_start, period_end, revenue, currency) VALUES
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'sms', 'campaign', (NOW() - INTERVAL '7 days')::date, NOW()::date, 180.00, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'sms', 'campaign', (NOW() - INTERVAL '14 days')::date, (NOW() - INTERVAL '7 days')::date, 165.50, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'sms', 'campaign', (NOW() - INTERVAL '21 days')::date, (NOW() - INTERVAL '14 days')::date, 200.25, 'BRL'),
('cc232dc0-7ddc-4260-882b-919d062fb42c', 'sms', 'campaign', (NOW() - INTERVAL '30 days')::date, (NOW() - INTERVAL '21 days')::date, 145.75, 'BRL');