-- Create enums
CREATE TYPE order_status AS ENUM (
  'DRAFT',
  'AWAITING_PAYMENT', 
  'PAID',
  'LYRICS_DELIVERED',
  'WAITING_APPROVAL',
  'APPROVED',
  'GENERATING_TRACK',
  'TRACK_READY',
  'DELIVERED'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PAID', 
  'FAILED',
  'REFUNDED'
);

CREATE TYPE track_status AS ENUM (
  'QUEUED',
  'GENERATING',
  'READY',
  'FAILED'
);

CREATE TYPE consent_type AS ENUM (
  'LGPD',
  'YouTube'
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  occasion TEXT NOT NULL,
  style TEXT NOT NULL,
  tone TEXT NOT NULL,
  duration_target_sec INTEGER NOT NULL,
  story_raw TEXT NOT NULL,
  story_summary TEXT,
  status order_status DEFAULT 'DRAFT',
  price_cents INTEGER NOT NULL,
  payment_provider TEXT,
  payment_status payment_status DEFAULT 'PENDING',
  approved_lyric_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lyrics table
CREATE TABLE public.lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  version TEXT NOT NULL CHECK (version IN ('A', 'B', 'C')),
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  prompt_json JSONB NOT NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  lyric_id UUID REFERENCES public.lyrics(id) ON DELETE CASCADE,
  suno_ref TEXT,
  seed TEXT,
  status track_status DEFAULT 'QUEUED',
  audio_url TEXT,
  cover_url TEXT,
  rights_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create consents table
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type consent_type NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT
);

-- Create event_logs table
CREATE TABLE public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for approved_lyric_id
ALTER TABLE public.orders 
ADD CONSTRAINT fk_approved_lyric 
FOREIGN KEY (approved_lyric_id) REFERENCES public.lyrics(id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for lyrics
CREATE POLICY "Users can view lyrics of own orders" ON public.lyrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = lyrics.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Create RLS policies for tracks
CREATE POLICY "Users can view tracks of own orders" ON public.tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = tracks.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Create RLS policies for consents
CREATE POLICY "Users can view own consents" ON public.consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents" ON public.consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for event_logs
CREATE POLICY "Users can view event logs of own orders" ON public.event_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = event_logs.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Create policies for edge functions to insert/update data
CREATE POLICY "Allow service role to insert lyrics" ON public.lyrics
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update orders" ON public.orders
  FOR UPDATE TO service_role USING (true);

CREATE POLICY "Allow service role to insert tracks" ON public.tracks
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update tracks" ON public.tracks
  FOR UPDATE TO service_role USING (true);

CREATE POLICY "Allow service role to insert event logs" ON public.event_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();