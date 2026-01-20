-- Create audio_samples table for showcasing example songs
CREATE TABLE public.audio_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  style TEXT NOT NULL,
  occasion TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_samples ENABLE ROW LEVEL SECURITY;

-- Anyone can view active samples
CREATE POLICY "Anyone can view active audio samples"
  ON public.audio_samples FOR SELECT
  USING (is_active = true);

-- Only admins can manage samples
CREATE POLICY "Admins can manage audio samples"
  ON public.audio_samples FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_audio_samples_updated_at
  BEFORE UPDATE ON public.audio_samples
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.audio_samples (title, description, style, occasion, audio_url, cover_url, sort_order) VALUES
  ('Amor de Pai', 'Uma homenagem emocionante de pai para filha nos seus 15 anos', 'Sertanejo', 'Aniversário', '', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop', 1),
  ('Nossa Jornada', 'A história de amor do casal desde o primeiro encontro', 'Pop Romântico', 'Casamento', '', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&h=300&fit=crop', 2),
  ('Força da Fé', 'Louvor personalizado para a igreja celebrar vitórias', 'Worship', 'Igreja', '', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop', 3);