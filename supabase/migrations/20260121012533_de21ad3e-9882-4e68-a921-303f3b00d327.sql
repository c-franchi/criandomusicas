-- Add instrumental pricing variants (20% cheaper than standard)
INSERT INTO pricing_config (id, name, price_display, price_cents, price_promo_cents, features, is_active, is_popular, sort_order, stripe_price_id)
VALUES 
  ('single_instrumental', 'Instrumental Única', 'R$ 38,32', 3832, 1592, '["1 música instrumental", "Seleção de instrumentos personalizada", "Solo de instrumento opcional", "Alta qualidade", "Entrega por WhatsApp", "Suporte prioritário"]', true, false, 4, null),
  ('package_instrumental', 'Pacote 3 Instrumentais', 'R$ 79,92', 7992, null, '["Até 3 músicas instrumentais", "Instrumentação personalizada cada", "Solos opcionais", "Alta qualidade", "Entrega por WhatsApp", "Suporte VIP"]', true, false, 5, null),
  ('subscription_instrumental', 'Pacote 5 Instrumentais', 'R$ 87,92', 8792, null, '["Até 5 músicas instrumentais", "Instrumentação personalizada cada", "Solos opcionais", "Qualidade premium", "Entrega por WhatsApp", "Suporte 24/7", "Prioridade na fila"]', true, false, 6, null)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_display = EXCLUDED.price_display,
  price_cents = EXCLUDED.price_cents,
  price_promo_cents = EXCLUDED.price_promo_cents,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;