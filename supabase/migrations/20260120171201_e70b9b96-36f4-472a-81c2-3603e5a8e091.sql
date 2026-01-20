-- Create storage bucket for audio samples
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-samples', 'audio-samples', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view audio files
CREATE POLICY "Anyone can view audio samples"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-samples');

-- Allow admins to upload audio files
CREATE POLICY "Admins can upload audio samples"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-samples' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to update audio files
CREATE POLICY "Admins can update audio samples"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audio-samples' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to delete audio files
CREATE POLICY "Admins can delete audio samples"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-samples' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);