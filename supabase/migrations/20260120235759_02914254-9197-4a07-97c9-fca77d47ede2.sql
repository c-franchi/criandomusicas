-- Create PIX configuration table
CREATE TABLE public.pix_config (
  id text PRIMARY KEY DEFAULT 'main',
  pix_key text NOT NULL DEFAULT '14.389.841/0001-47',
  pix_name text NOT NULL DEFAULT 'Criando Músicas',
  qr_code_url text NOT NULL DEFAULT '/images/pix-qrcode.jpg',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default configuration
INSERT INTO public.pix_config (id, pix_key, pix_name, qr_code_url)
VALUES ('main', '14.389.841/0001-47', 'Criando Músicas', '/images/pix-qrcode.jpg');

-- Enable RLS
ALTER TABLE public.pix_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view PIX config (needed for checkout)
CREATE POLICY "Anyone can view pix config"
ON public.pix_config
FOR SELECT
USING (true);

-- Only admins can update PIX config
CREATE POLICY "Admins can update pix config"
ON public.pix_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_pix_config_updated_at
BEFORE UPDATE ON public.pix_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();