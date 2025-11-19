-- Adicionar coluna data_type para suportar micro-jobs
-- Permite dividir sync em jobs menores por tipo de dados
-- Isso evita timeouts ao processar grandes volumes de dados

ALTER TABLE sync_queue
ADD COLUMN data_type TEXT CHECK (data_type IN ('analytics', 'campaigns', 'flows', 'orders'));

-- Criar índice para melhorar performance nas queries
CREATE INDEX idx_sync_queue_data_type ON sync_queue(data_type);

-- Adicionar comentário explicativo
COMMENT ON COLUMN sync_queue.data_type IS 'Type of data to sync. NULL means sync all types (legacy behavior). Specific types: analytics, campaigns, flows, orders';
