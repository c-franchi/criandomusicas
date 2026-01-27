-- Corrigir pronúncia de UTI para o pedido atual
UPDATE public.orders 
SET pronunciations = '[{"term": "UTI", "phonetic": "utei"}]'::jsonb
WHERE id = '276c6328-1bfe-45e1-ab9f-386b1231c5fb';