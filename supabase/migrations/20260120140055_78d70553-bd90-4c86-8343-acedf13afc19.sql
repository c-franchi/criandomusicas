-- Create ENUMs
CREATE TYPE public.order_status AS ENUM ('DRAFT', 'AWAITING_PAYMENT', 'PAID', 'BRIEFING_COMPLETE', 'LYRICS_PENDING', 'LYRICS_GENERATED', 'LYRICS_APPROVED', 'MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE public.track_status AS ENUM ('QUEUED', 'GENERATING', 'READY', 'FAILED');
CREATE TYPE public.consent_type AS ENUM ('LGPD', 'YouTube');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'free',
  songs_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'DRAFT',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  music_style TEXT,
  emotion TEXT,
  target TEXT,
  music_structure TEXT,
  tone TEXT,
  purpose TEXT,
  story TEXT,
  style_prompt TEXT,
  final_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lyrics table
CREATE TABLE public.lyrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  audio_url TEXT,
  status track_status NOT NULL DEFAULT 'QUEUED',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consents table
CREATE TABLE public.consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_logs table
CREATE TABLE public.event_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for lyrics
CREATE POLICY "Users can view lyrics of their orders" ON public.lyrics FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = lyrics.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create lyrics for their orders" ON public.lyrics FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = lyrics.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can update lyrics of their orders" ON public.lyrics FOR UPDATE USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = lyrics.order_id AND orders.user_id = auth.uid()));

-- RLS Policies for tracks
CREATE POLICY "Users can view tracks of their orders" ON public.tracks FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = tracks.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create tracks for their orders" ON public.tracks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = tracks.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can update tracks of their orders" ON public.tracks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = tracks.order_id AND orders.user_id = auth.uid()));

-- RLS Policies for consents
CREATE POLICY "Users can view their own consents" ON public.consents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own consents" ON public.consents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own consents" ON public.consents FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for event_logs
CREATE POLICY "Users can view their own event logs" ON public.event_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create event logs" ON public.event_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();