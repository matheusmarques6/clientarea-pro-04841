-- Allow users to update credentials for stores they have access to
CREATE POLICY "Users can update store credentials" ON public.stores
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.v_user_stores 
    WHERE user_id = auth.uid() AND store_id = stores.id
  )
);