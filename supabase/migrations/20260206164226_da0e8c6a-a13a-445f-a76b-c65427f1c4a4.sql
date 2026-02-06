
-- ========================================
-- Modo Áudio: Tabelas + Bucket + RLS
-- ========================================

-- 1) Tabela audio_inputs
CREATE TABLE public.audio_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_sec REAL,
  size_bytes INTEGER,
  source TEXT NOT NULL DEFAULT 'upload',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_inputs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audio_inputs
CREATE POLICY "Users can create their own audio inputs"
  ON public.audio_inputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own audio inputs"
  ON public.audio_inputs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio inputs"
  ON public.audio_inputs FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audio inputs"
  ON public.audio_inputs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Tabela transcriptions
CREATE TABLE public.transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audio_id UUID NOT NULL REFERENCES public.audio_inputs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transcript_text TEXT NOT NULL,
  segments_json JSONB,
  model TEXT DEFAULT 'whisper-1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transcriptions
CREATE POLICY "Users can create their own transcriptions"
  ON public.transcriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own transcriptions"
  ON public.transcriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcriptions"
  ON public.transcriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transcriptions"
  ON public.transcriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Bucket para áudios (privado - somente dono pode acessar)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-inputs', 'audio-inputs', false);

-- Storage policies for audio-inputs bucket
CREATE POLICY "Users can upload their own audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audio-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all audio files
CREATE POLICY "Admins can view all audio inputs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-inputs' AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ));
