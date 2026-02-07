-- Add audio_input_id column to orders for audio mode reference
ALTER TABLE public.orders ADD COLUMN audio_input_id UUID REFERENCES public.audio_inputs(id);

-- Add index for performance
CREATE INDEX idx_orders_audio_input_id ON public.orders(audio_input_id) WHERE audio_input_id IS NOT NULL;