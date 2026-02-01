-- Add credits column to pricing_config table
ALTER TABLE public.pricing_config ADD COLUMN IF NOT EXISTS credits integer DEFAULT 1;

-- Update existing plans with correct credit amounts
UPDATE public.pricing_config SET credits = 1 WHERE id IN ('single', 'single_instrumental', 'single_custom_lyric');
UPDATE public.pricing_config SET credits = 3 WHERE id IN ('package', 'package_instrumental');
UPDATE public.pricing_config SET credits = 5 WHERE id IN ('subscription', 'subscription_instrumental');
UPDATE public.pricing_config SET credits = 50 WHERE id = 'creator_start';
UPDATE public.pricing_config SET credits = 150 WHERE id = 'creator_pro';
UPDATE public.pricing_config SET credits = 300 WHERE id = 'creator_studio';
UPDATE public.pricing_config SET credits = 50 WHERE id = 'creator_start_instrumental';
UPDATE public.pricing_config SET credits = 150 WHERE id = 'creator_pro_instrumental';
UPDATE public.pricing_config SET credits = 300 WHERE id = 'creator_studio_instrumental';