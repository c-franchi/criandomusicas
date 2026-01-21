-- Create table for video orders (video editing service)
CREATE TABLE public.video_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'AWAITING_PAYMENT',
  payment_status text NOT NULL DEFAULT 'PENDING',
  amount integer NOT NULL DEFAULT 5000,
  currency text NOT NULL DEFAULT 'BRL',
  video_type text NOT NULL DEFAULT 'photos_5', -- photos_5, photos_8, video_2min
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Create table for uploaded media files
CREATE TABLE public.video_order_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_order_id uuid NOT NULL REFERENCES public.video_orders(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL, -- 'image' or 'video'
  file_name text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for reaction videos (social proof)
CREATE TABLE public.reaction_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  is_approved boolean DEFAULT false,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaction_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_orders
CREATE POLICY "Users can view their own video orders" 
ON public.video_orders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video orders" 
ON public.video_orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video orders" 
ON public.video_orders FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all video orders"
ON public.video_orders FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all video orders"
ON public.video_orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for video_order_files
CREATE POLICY "Users can view files for their video orders" 
ON public.video_order_files FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.video_orders vo 
  WHERE vo.id = video_order_id AND vo.user_id = auth.uid()
));

CREATE POLICY "Users can upload files to their video orders" 
ON public.video_order_files FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.video_orders vo 
  WHERE vo.id = video_order_id AND vo.user_id = auth.uid() AND vo.payment_status = 'PAID'
));

CREATE POLICY "Admins can view all video order files"
ON public.video_order_files FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reaction_videos
CREATE POLICY "Users can view their own reaction videos" 
ON public.reaction_videos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own reaction videos" 
ON public.reaction_videos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reaction videos" 
ON public.reaction_videos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view approved public reaction videos"
ON public.reaction_videos FOR SELECT
USING (is_approved = true AND is_public = true);

CREATE POLICY "Admins can view all reaction videos"
ON public.reaction_videos FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all reaction videos"
ON public.reaction_videos FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for video order uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('video-uploads', 'video-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for reaction videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reaction-videos', 'reaction-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video-uploads
CREATE POLICY "Users can upload to video-uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their video uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view video-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-uploads');

-- Storage policies for reaction-videos
CREATE POLICY "Users can upload reaction videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reaction-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view reaction videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'reaction-videos');

-- Enable realtime for video_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_orders;

-- Trigger for updated_at
CREATE TRIGGER update_video_orders_updated_at
BEFORE UPDATE ON public.video_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reaction_videos_updated_at
BEFORE UPDATE ON public.reaction_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();