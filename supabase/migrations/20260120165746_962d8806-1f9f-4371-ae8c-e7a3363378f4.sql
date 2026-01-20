-- Add DELETE policy for admins on audio_samples
CREATE POLICY "Admins can delete audio samples"
ON public.audio_samples
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));