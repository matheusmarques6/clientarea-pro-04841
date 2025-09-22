-- Fix foreign key constraint to allow cascading deletes
-- First drop the existing constraint
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_client_id_fkey;

-- Recreate with CASCADE DELETE
ALTER TABLE public.stores 
ADD CONSTRAINT stores_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE CASCADE;