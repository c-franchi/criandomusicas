UPDATE public.orders 
SET pronunciations = '[{"word": "UTI", "phonetic": "U-T-I"}]'::jsonb
WHERE id = '276c6328-1bfe-45e1-ab9f-386b1231c5fb'