-- Update Stripe Price IDs for Creator vocal plans
UPDATE public.pricing_config 
SET stripe_price_id = 'price_1SttuCCqEk0oYMYYZiZ1STDQ'
WHERE id = 'creator_start';

UPDATE public.pricing_config 
SET stripe_price_id = 'price_1SttueCqEk0oYMYYw1wy4Obg'
WHERE id = 'creator_pro';

UPDATE public.pricing_config 
SET stripe_price_id = 'price_1SttuwCqEk0oYMYYRa3G4KIL'
WHERE id = 'creator_studio';

-- Update Stripe Price IDs for Creator instrumental plans
UPDATE public.pricing_config 
SET stripe_price_id = 'price_1SttvFCqEk0oYMYYfEimVHzi'
WHERE id = 'creator_start_instrumental';

UPDATE public.pricing_config 
SET stripe_price_id = 'price_1SttvvCqEk0oYMYYr6NCCjTr'
WHERE id = 'creator_pro_instrumental';

UPDATE public.pricing_config 
SET stripe_price_id = 'price_1SttwHCqEk0oYMYY74BSnV1W'
WHERE id = 'creator_studio_instrumental';