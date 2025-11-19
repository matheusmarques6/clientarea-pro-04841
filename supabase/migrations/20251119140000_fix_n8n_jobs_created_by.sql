-- Permitir NULL no campo created_by da tabela n8n_jobs
-- Isso permite que jobs sejam criados pelo worker (sistema) sem usuário específico

ALTER TABLE n8n_jobs
ALTER COLUMN created_by DROP NOT NULL;

COMMENT ON COLUMN n8n_jobs.created_by IS 'User ID who created this job. NULL for system-created jobs (worker).';
