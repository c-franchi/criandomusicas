ALTER TABLE public.orders
  ADD COLUMN language text
  CHECK (language IS NULL OR language IN ('pt-BR', 'en', 'es', 'it'));

COMMENT ON COLUMN public.orders.language IS 'Generation language captured from the briefing; used by lyrics, style prompts, payment confirmation, and retries.';