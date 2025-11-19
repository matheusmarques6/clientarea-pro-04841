-- Adicionar campos de resumo ao store_sync_cache para facilitar listagem
-- Isso permite mostrar info básica sem ler o campo JSONB 'data'

ALTER TABLE store_sync_cache
ADD COLUMN IF NOT EXISTS record_count INTEGER,
ADD COLUMN IF NOT EXISTS data_summary TEXT;

-- Criar índice para facilitar queries
CREATE INDEX IF NOT EXISTS idx_store_sync_cache_record_count
ON store_sync_cache(record_count);

COMMENT ON COLUMN store_sync_cache.record_count IS 'Number of records in this cache entry (e.g., number of campaigns, flows, orders)';
COMMENT ON COLUMN store_sync_cache.data_summary IS 'Human-readable summary of the cached data';
