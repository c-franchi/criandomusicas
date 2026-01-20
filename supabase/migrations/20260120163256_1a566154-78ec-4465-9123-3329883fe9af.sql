-- Create pricing_config table for admin price management
CREATE TABLE public.pricing_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_display TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  price_promo_cents INTEGER,
  stripe_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view pricing (public)
CREATE POLICY "Anyone can view pricing" 
ON public.pricing_config 
FOR SELECT 
USING (true);

-- Only admins can modify pricing
CREATE POLICY "Admins can update pricing" 
ON public.pricing_config 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pricing" 
ON public.pricing_config 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add admin policy for orders table so admins can view all orders
CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Insert initial pricing data
INSERT INTO public.pricing_config (id, name, price_display, price_cents, price_promo_cents, features, is_active, is_popular, sort_order) VALUES
('single', 'Música Única', 'R$ 29,90', 2990, 990, '["1 música completa", "2 letras personalizadas para escolher", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte prioritário"]', true, false, 1),
('package', 'Pacote 3 Músicas', 'R$ 49,90', 4990, null, '["3 músicas completas", "2 letras personalizadas cada", "Economia de 16%", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte VIP"]', true, true, 2),
('subscription', 'Assinatura Mensal', 'R$ 69,90', 6990, null, '["Até 5 músicas por mês", "2 letras personalizadas cada", "Letra + áudio profissional", "Qualidade premium", "Entrega instantânea", "Suporte 24/7", "Acesso antecipado", "Cancelamento a qualquer momento"]', true, false, 3);

-- Create trigger for updated_at
CREATE TRIGGER update_pricing_config_updated_at
BEFORE UPDATE ON public.pricing_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();