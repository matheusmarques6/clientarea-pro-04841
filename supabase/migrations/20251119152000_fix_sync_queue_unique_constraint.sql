-- Ajustar constraint UNIQUE para suportar micro-jobs
-- Permitir múltiplos jobs para o mesmo store/period com data_types diferentes

-- Remover constraint antiga
ALTER TABLE sync_queue
DROP CONSTRAINT IF EXISTS sync_queue_store_id_period_start_period_end_status_key;

-- Adicionar nova constraint que inclui data_type
-- Permite:
-- - 1 job "full sync" (data_type NULL) por store/period/status
-- - 4 jobs "micro" (data_type NOT NULL) por store/period/status
CREATE UNIQUE INDEX idx_sync_queue_unique_full_sync
ON sync_queue (store_id, period_start, period_end, status)
WHERE data_type IS NULL;

CREATE UNIQUE INDEX idx_sync_queue_unique_micro_jobs
ON sync_queue (store_id, period_start, period_end, status, data_type)
WHERE data_type IS NOT NULL;

COMMENT ON INDEX idx_sync_queue_unique_full_sync IS 'Ensures only one full sync job per store/period/status';
COMMENT ON INDEX idx_sync_queue_unique_micro_jobs IS 'Ensures only one micro-job per store/period/status/data_type';
