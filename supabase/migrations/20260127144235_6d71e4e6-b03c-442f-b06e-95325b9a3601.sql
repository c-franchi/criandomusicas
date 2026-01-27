-- Tabela para rastrear eventos de compartilhamento
CREATE TABLE public.share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID, -- Pode ser NULL para visitantes anônimos
  event_type TEXT NOT NULL, -- 'share', 'view', 'play', 'cta_click'
  platform TEXT, -- 'whatsapp', 'facebook', 'instagram', 'native', 'copy', 'direct'
  referrer TEXT, -- URL de origem (para saber de onde veio)
  user_agent TEXT, -- Browser/device info
  ip_hash TEXT, -- Hash do IP para contar únicos sem armazenar IP
  metadata JSONB DEFAULT '{}', -- Dados extras
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_share_analytics_order_id ON public.share_analytics(order_id);
CREATE INDEX idx_share_analytics_event_type ON public.share_analytics(event_type);
CREATE INDEX idx_share_analytics_created_at ON public.share_analytics(created_at);

-- RLS: Permitir INSERT anônimo (para tracking público), SELECT apenas admin
ALTER TABLE public.share_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics"
  ON public.share_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all analytics"
  ON public.share_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));