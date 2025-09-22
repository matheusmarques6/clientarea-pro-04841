-- Adicionar políticas RLS que estão faltando

-- Para a tabela store_members (se não existir política)
CREATE POLICY "Admins can manage store_members" 
ON public.store_members 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Para a tabela customers (se não existir política)  
CREATE POLICY "Admins can manage customers" 
ON public.customers 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Atualizar política para stores para permitir admins inserir/atualizar/deletar
CREATE POLICY "Admins can manage stores" 
ON public.stores 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update stores" 
ON public.stores 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete stores" 
ON public.stores 
FOR DELETE 
USING (is_admin(auth.uid()));