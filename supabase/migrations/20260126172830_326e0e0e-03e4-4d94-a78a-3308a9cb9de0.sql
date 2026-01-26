-- Adicionar planos de assinatura para criadores de conteúdo
INSERT INTO pricing_config (id, name, price_cents, price_promo_cents, price_display, features, is_popular, is_active, sort_order) VALUES
('creator_start', 'Creator Start', 4990, NULL, 'R$ 49,90/mês',
 '["3 músicas/mês", "Capas inclusas", "Formatos curtos (30s, 60s)", "Entrega em 48h", "Suporte por email"]'::jsonb, 
 false, true, 10),
 
('creator_pro', 'Creator Pro', 9990, NULL, 'R$ 99,90/mês',
 '["8 músicas/mês", "Capas inclusas", "Formatos curtos", "Entrega prioritária 24h", "Suporte VIP WhatsApp", "Revisões ilimitadas de letra"]'::jsonb,
 true, true, 11),
 
('creator_studio', 'Creator Studio', 19990, NULL, 'R$ 199,90/mês',
 '["20 músicas/mês", "Capas + Vídeos básicos", "Todos os formatos", "Entrega express 12h", "Suporte dedicado", "Diretor de conta"]'::jsonb,
 false, true, 12)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  price_display = EXCLUDED.price_display,
  features = EXCLUDED.features,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;