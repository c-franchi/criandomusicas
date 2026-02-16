
-- Add email tracking fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_24h_sent boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_created_music boolean DEFAULT false;

-- Create seasonal_campaigns table
CREATE TABLE public.seasonal_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,
  event_date date NOT NULL,
  send_days_before integer NOT NULL DEFAULT 7,
  email_subject text NOT NULL,
  email_body_html text NOT NULL,
  cta_text text DEFAULT 'Criar minha música',
  cta_url text DEFAULT '/briefing',
  is_active boolean DEFAULT true,
  last_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.seasonal_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can manage campaigns
CREATE POLICY "Admins can manage seasonal campaigns"
  ON public.seasonal_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active campaigns (for cron job via service role)
CREATE POLICY "Service can view active campaigns"
  ON public.seasonal_campaigns FOR SELECT
  USING (is_active = true);

-- Create email_campaign_logs to track sent campaign emails
CREATE TABLE public.email_campaign_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.seasonal_campaigns(id),
  campaign_type text NOT NULL, -- 'reengagement_24h' or 'seasonal'
  user_id uuid NOT NULL,
  email text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'sent'
);

ALTER TABLE public.email_campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaign logs"
  ON public.email_campaign_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to set has_created_music when user creates first order
CREATE OR REPLACE FUNCTION public.mark_user_has_created_music()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET has_created_music = true
  WHERE user_id = NEW.user_id AND (has_created_music IS NULL OR has_created_music = false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_order_created_mark_music
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_user_has_created_music();

-- Insert some default seasonal campaigns
INSERT INTO public.seasonal_campaigns (event_name, event_date, send_days_before, email_subject, email_body_html, cta_text, cta_url) VALUES
('Dia das Mães', '2026-05-10', 7, '💐 Dia das Mães está chegando! Que tal uma música para ela?', '<p>O Dia das Mães está chegando. Surpreenda sua mãe com uma música feita especialmente para ela.</p>', '🎁 Criar música para mamãe', '/briefing'),
('Dia dos Namorados', '2026-06-12', 7, '💕 Dia dos Namorados: surpreenda com uma música personalizada!', '<p>O Dia dos Namorados está chegando. Transforme sua história de amor em uma música única.</p>', '💕 Criar música romântica', '/briefing'),
('Dia dos Pais', '2026-08-09', 7, '👨 Dia dos Pais: uma homenagem musical inesquecível!', '<p>O Dia dos Pais está chegando. Crie uma música personalizada para homenagear seu pai.</p>', '🎁 Criar música para papai', '/briefing'),
('Natal', '2026-12-25', 10, '🎄 Natal chegando! Presenteie com uma música personalizada', '<p>O Natal está chegando. Que tal um presente único e emocionante? Uma música feita sob medida.</p>', '🎄 Criar música de Natal', '/briefing');
