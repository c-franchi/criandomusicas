-- Create storage bucket for cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view cover images (public bucket)
CREATE POLICY "Anyone can view cover images"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

-- Allow authenticated users to upload their own covers
CREATE POLICY "Users can upload their own covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'covers' 
  AND auth.role() = 'authenticated'
);

-- Allow admins to manage all covers
CREATE POLICY "Admins can manage covers"
ON storage.objects FOR ALL
USING (
  bucket_id = 'covers' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to delete covers
CREATE POLICY "Admins can delete covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'covers'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);