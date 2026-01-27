-- Corrigir preços dos planos avulsos para corresponder ao Stripe
-- Música Única: R$ 9,90 (sem promo)
UPDATE pricing_config SET 
  price_cents = 990, 
  price_display = 'R$ 9,90',
  price_promo_cents = NULL
WHERE id = 'single';

-- Pacote 3 Músicas: R$ 24,90
UPDATE pricing_config SET 
  price_cents = 2490, 
  price_display = 'R$ 24,90',
  price_promo_cents = NULL
WHERE id = 'package';

-- Pacote 5 Músicas: R$ 39,90
UPDATE pricing_config SET 
  price_cents = 3990, 
  price_display = 'R$ 39,90',
  price_promo_cents = NULL
WHERE id = 'subscription';

-- Música Única Instrumental: R$ 7,90 (sem promo)
UPDATE pricing_config SET 
  price_cents = 790, 
  price_display = 'R$ 7,90',
  price_promo_cents = NULL
WHERE id = 'single_instrumental';

-- Pacote 3 Músicas Instrumental: R$ 19,90
UPDATE pricing_config SET 
  price_cents = 1990, 
  price_display = 'R$ 19,90',
  price_promo_cents = NULL
WHERE id = 'package_instrumental';

-- Pacote 5 Músicas Instrumental: R$ 31,90
UPDATE pricing_config SET 
  price_cents = 3190, 
  price_display = 'R$ 31,90',
  price_promo_cents = NULL
WHERE id = 'subscription_instrumental';

-- Música com Letra Própria: R$ 9,90 (sem promo)
UPDATE pricing_config SET 
  price_cents = 990, 
  price_display = 'R$ 9,90',
  price_promo_cents = NULL
WHERE id = 'single_custom_lyric';