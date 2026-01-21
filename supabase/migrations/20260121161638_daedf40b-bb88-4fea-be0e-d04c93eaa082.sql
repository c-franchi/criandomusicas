-- Add column for edited video URL to video_orders table
ALTER TABLE public.video_orders 
ADD COLUMN IF NOT EXISTS edited_video_url text DEFAULT NULL;

-- Add column for when edited video was delivered
ALTER TABLE public.video_orders 
ADD COLUMN IF NOT EXISTS edited_video_delivered_at timestamp with time zone DEFAULT NULL;