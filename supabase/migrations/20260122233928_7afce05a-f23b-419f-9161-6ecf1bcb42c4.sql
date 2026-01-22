-- Add new fields for enhanced functionality
ALTER TABLE orders ADD COLUMN IF NOT EXISTS song_title TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_custom_lyric BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prompt_validation_score INTEGER;

-- Create custom lyric pricing plan
INSERT INTO pricing_config (id, name, price_cents, price_display, is_active, sort_order, features)
VALUES ('single_custom_lyric', 'Música com Letra Própria', 990, 'R$ 9,90', true, 5, '["1 música completa", "Use sua própria letra", "Alta qualidade", "Entrega por WhatsApp"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  price_display = EXCLUDED.price_display,
  is_active = EXCLUDED.is_active,
  features = EXCLUDED.features;