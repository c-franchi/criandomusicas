-- Create commemorative_dates table for holiday suggestions
CREATE TABLE public.commemorative_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  name_it TEXT,
  emoji TEXT DEFAULT '🎉',
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  day INTEGER CHECK (day IS NULL OR (day >= 1 AND day <= 31)),
  calculation_rule TEXT,
  suggested_music_type TEXT,
  suggested_atmosphere TEXT,
  suggested_emotion TEXT,
  description TEXT,
  description_en TEXT,
  description_es TEXT,
  description_it TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commemorative_dates ENABLE ROW LEVEL SECURITY;

-- Anyone can view active commemorative dates
CREATE POLICY "Anyone can view active commemorative dates"
ON public.commemorative_dates
FOR SELECT
USING (is_active = true);

-- Admins can manage commemorative dates
CREATE POLICY "Admins can manage commemorative dates"
ON public.commemorative_dates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial commemorative dates
INSERT INTO public.commemorative_dates (name, name_en, name_es, name_it, emoji, month, day, calculation_rule, suggested_music_type, suggested_atmosphere, suggested_emotion, description, description_en, description_es, description_it, sort_order) VALUES
-- Carnaval (variable - 47 days before Easter)
('Carnaval', 'Carnival', 'Carnaval', 'Carnevale', '🎭', 2, NULL, 'carnival', 'parodia', 'festivo', 'alegria', 
 'A IA pode criar uma paródia animada perfeita para a folia!',
 'AI can create a fun parody perfect for the celebration!',
 '¡La IA puede crear una parodia animada perfecta para la fiesta!',
 'L''IA può creare una parodia animata perfetta per la festa!', 1),

-- International Women's Day
('Dia Internacional da Mulher', 'International Women''s Day', 'Día Internacional de la Mujer', 'Giornata Internazionale della Donna', '👩', 3, 8, NULL, 'homenagem', 'intimo', 'gratidao',
 'Homenageie as mulheres especiais da sua vida com uma música única!',
 'Honor the special women in your life with a unique song!',
 '¡Homenajea a las mujeres especiales de tu vida con una canción única!',
 'Omaggia le donne speciali della tua vita con una canzone unica!', 2),

-- Easter (variable)
('Páscoa', 'Easter', 'Pascua', 'Pasqua', '🐰', 4, NULL, 'easter', 'religiosa', 'leve', 'esperanca',
 'Crie uma música de renovação e esperança para esta Páscoa!',
 'Create a song of renewal and hope for this Easter!',
 '¡Crea una canción de renovación y esperanza para esta Pascua!',
 'Crea una canzone di rinnovamento e speranza per questa Pasqua!', 3),

-- Mother's Day (2nd Sunday of May in Brazil)
('Dia das Mães', 'Mother''s Day', 'Día de las Madres', 'Festa della Mamma', '👩‍👧‍👦', 5, NULL, 'second_sunday_may', 'homenagem', 'intimo', 'amor',
 'Surpreenda sua mãe com uma música feita especialmente para ela!',
 'Surprise your mom with a song made especially for her!',
 '¡Sorprende a tu mamá con una canción hecha especialmente para ella!',
 'Sorprendi la tua mamma con una canzone fatta apposta per lei!', 4),

-- Valentine's Day (Brazil - June 12)
('Dia dos Namorados', 'Valentine''s Day', 'Día de los Enamorados', 'San Valentino', '❤️', 6, 12, NULL, 'romantica', 'intimo', 'amor',
 'Declare seu amor com uma música romântica personalizada!',
 'Declare your love with a personalized romantic song!',
 '¡Declara tu amor con una canción romántica personalizada!',
 'Dichiara il tuo amore con una canzone romantica personalizzata!', 5),

-- Father's Day (2nd Sunday of August in Brazil)
('Dia dos Pais', 'Father''s Day', 'Día del Padre', 'Festa del Papà', '👨‍👧‍👦', 8, NULL, 'second_sunday_august', 'homenagem', 'intimo', 'gratidao',
 'Homenageie seu pai com uma música emocionante!',
 'Honor your father with a moving song!',
 '¡Homenajea a tu padre con una canción emocionante!',
 'Omaggia tuo padre con una canzone emozionante!', 6),

-- Customer Day
('Dia do Cliente', 'Customer Day', 'Día del Cliente', 'Giornata del Cliente', '🤝', 9, 15, NULL, 'corporativa', 'festivo', 'gratidao',
 'Crie um jingle especial para agradecer seus clientes!',
 'Create a special jingle to thank your customers!',
 '¡Crea un jingle especial para agradecer a tus clientes!',
 'Crea un jingle speciale per ringraziare i tuoi clienti!', 7),

-- Children's Day (Brazil)
('Dia das Crianças', 'Children''s Day', 'Día del Niño', 'Giornata dei Bambini', '🎈', 10, 12, NULL, 'infantil', 'festivo', 'alegria',
 'Crie uma música divertida para alegrar a criançada!',
 'Create a fun song to delight the kids!',
 '¡Crea una canción divertida para alegrar a los niños!',
 'Crea una canzone divertente per allietare i bambini!', 8),

-- Halloween
('Halloween', 'Halloween', 'Halloween', 'Halloween', '🎃', 10, 31, NULL, 'parodia', 'misterioso', 'zoeira',
 'Que tal uma música assustadoramente divertida?',
 'How about a spookily fun song?',
 '¿Qué tal una canción terroríficamente divertida?',
 'Che ne dici di una canzone spaventosamente divertente?', 9),

-- Christmas
('Natal', 'Christmas', 'Navidad', 'Natale', '🎄', 12, 25, NULL, 'homenagem', 'festivo', 'amor',
 'Crie uma música natalina especial para sua família!',
 'Create a special Christmas song for your family!',
 '¡Crea una canción navideña especial para tu familia!',
 'Crea una canzone natalizia speciale per la tua famiglia!', 10),

-- New Year's Eve
('Réveillon', 'New Year''s Eve', 'Nochevieja', 'Capodanno', '🎆', 12, 31, NULL, 'homenagem', 'festivo', 'esperanca',
 'Celebre a virada do ano com uma música especial!',
 'Celebrate the turn of the year with a special song!',
 '¡Celebra el cambio de año con una canción especial!',
 'Festeggia il cambio dell''anno con una canzone speciale!', 11);