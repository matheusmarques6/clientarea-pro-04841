-- Create storage bucket for store logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for store logos
CREATE POLICY "Store logos are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'store-logos');

CREATE POLICY "Users can upload logos for their stores" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'store-logos' AND
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() 
    AND store_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can update logos for their stores" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'store-logos' AND
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() 
    AND store_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete logos for their stores" ON storage.objects
FOR DELETE USING (
  bucket_id = 'store-logos' AND
  EXISTS (
    SELECT 1 FROM v_user_stores 
    WHERE user_id = auth.uid() 
    AND store_id::text = (storage.foldername(name))[1]
  )
);