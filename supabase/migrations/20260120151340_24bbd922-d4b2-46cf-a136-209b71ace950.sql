-- Enable realtime for orders table to track status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;