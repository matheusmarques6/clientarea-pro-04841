-- Adicionar constraint única para evitar duplicatas de integrações por loja e provedor
ALTER TABLE integrations ADD CONSTRAINT unique_store_provider UNIQUE (store_id, provider);