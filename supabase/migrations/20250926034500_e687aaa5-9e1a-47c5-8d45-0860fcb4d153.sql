-- Adicionar política para permitir que owners e managers atualizem configurações da loja
CREATE POLICY "Store owners and managers can update store settings"
ON public.stores
FOR UPDATE
USING (
  -- Permitir se é admin
  is_admin(auth.uid()) 
  OR 
  -- Ou se é owner ou manager da loja
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = stores.id 
    AND sm.user_id = auth.uid()
    AND sm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  -- Mesma verificação para WITH CHECK
  is_admin(auth.uid()) 
  OR 
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = stores.id 
    AND sm.user_id = auth.uid()
    AND sm.role IN ('owner', 'manager')
  )
);