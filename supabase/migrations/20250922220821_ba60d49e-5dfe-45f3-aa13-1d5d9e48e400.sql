-- Migrar todas as lojas para status 'connected'
UPDATE stores 
SET status = 'connected' 
WHERE status != 'connected';

-- Preencher customer_id com o client_id para dar permissão de visualização
UPDATE stores 
SET customer_id = client_id 
WHERE customer_id IS NULL;