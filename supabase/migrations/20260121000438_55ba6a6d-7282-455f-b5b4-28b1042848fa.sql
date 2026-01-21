-- Create storage bucket for final music tracks
INSERT INTO storage.buckets (id, name, public)
VALUES ('music-tracks', 'music-tracks', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view public music tracks
CREATE POLICY "Anyone can view music tracks"
ON storage.objects FOR SELECT
USING (bucket_id = 'music-tracks');

-- Only admins can upload music tracks
CREATE POLICY "Admins can upload music tracks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'music-tracks' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can update music tracks
CREATE POLICY "Admins can update music tracks"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'music-tracks' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete music tracks
CREATE POLICY "Admins can delete music tracks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'music-tracks' 
  AND public.has_role(auth.uid(), 'admin')
);