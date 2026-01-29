-- Correção de inconsistência de preço: price_display deve refletir o price_cents (790 = R$ 7,90)
UPDATE pricing_config 
SET price_display = 'R$ 7,90' 
WHERE id = 'single_custom_lyric';