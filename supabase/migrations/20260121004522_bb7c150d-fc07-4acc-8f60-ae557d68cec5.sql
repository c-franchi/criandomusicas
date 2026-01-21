-- Create trigger to set music_ready_at when status changes to MUSIC_READY
CREATE OR REPLACE FUNCTION public.set_music_ready_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'MUSIC_READY' AND (OLD.status IS NULL OR OLD.status != 'MUSIC_READY') THEN
    NEW.music_ready_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_music_ready_at_trigger ON public.orders;

CREATE TRIGGER set_music_ready_at_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_music_ready_at();