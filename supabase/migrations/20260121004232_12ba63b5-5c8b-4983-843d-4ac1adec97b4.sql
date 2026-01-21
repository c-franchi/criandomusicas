-- Add music_ready_at column to orders for tracking when music became ready
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS music_ready_at TIMESTAMP WITH TIME ZONE;

-- Add review_notification_sent column to track if we sent the 24h reminder
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_notification_sent BOOLEAN DEFAULT false;

-- Enable pg_cron and pg_net for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;