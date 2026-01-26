-- Add plan_id column to orders table to track which plan was selected
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.plan_id IS 'The plan ID selected during briefing (e.g., single, package, subscription, subscription_instrumental)';