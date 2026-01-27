import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Music, 
  Play, 
  Pause, 
  Home,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";

interface TrackData {
  audio_url: string;
  title: string;
  music_style: string;
  cover_url: string | null;
}

const MusicShare = () => {
  const { orderId } = useParams();
  const [track, setTrack] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchTrack = async () => {
      if (!orderId) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        // Use the public edge function to fetch track (bypasses RLS)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-track?orderId=${orderId}`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            }
          }
        );

        if (!response.ok) {
          console.error('Error fetching public track:', response.status);
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data?.audio_url) {
          console.error('No audio_url in response');
          setError(true);
          setLoading(false);
          return;
        }

        setTrack({
          audio_url: data.audio_url,
          title: data.title || 'Música Personalizada',
          music_style: data.music_style || '',
          cover_url: data.cover_url || null
        });
      } catch (err) {
        console.error('Error fetching track:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTrack();
  }, [orderId]);

  // Track analytics events
  const trackEvent = async (eventType: 'play' | 'cta_click') => {
    if (!orderId) return;
    try {
      await supabase.from('share_analytics').insert({
        order_id: orderId,
        event_type: eventType,
        platform: 'web',
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
    } catch (e) {
      console.error('Track error:', e);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Track play event only on first play
      if (!audioRef.current.played.length) {
        trackEvent('play');
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando música...</p>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="p-8 text-center max-w-md">
          <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Música não encontrada</h1>
          <p className="text-muted-foreground mb-6">
            Esta música pode ainda estar sendo produzida ou não existe.
          </p>
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Criar minha música
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const ogImage = track.cover_url || 'https://criandomusicas.com.br/og-image.jpg';
  const pageTitle = `${track.title} | Criando Músicas`;
  const pageDescription = `Ouça "${track.title}" - uma música personalizada criada com carinho. ${track.music_style ? `Estilo: ${track.music_style}` : ''}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="music.song" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted p-4 safe-area-inset">
        <Card className="p-6 sm:p-8 max-w-md w-full text-center mx-auto">
          {/* Cover Image or Logo */}
          <div className="mb-4 sm:mb-6">
            {track.cover_url ? (
              <img 
                src={track.cover_url} 
                alt={`Capa de ${track.title}`}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover mx-auto mb-3 sm:mb-4 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Music className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
            )}
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
            Criando Músicas
          </p>
        </div>

        {/* Track Info */}
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 break-words px-2">{track.title}</h1>
        {track.music_style && (
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">{track.music_style}</p>
        )}

        {/* Audio Element */}
        <audio 
          ref={audioRef} 
          src={track.audio_url}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />

        {/* Player Controls - Only Play, no Download for public share */}
        <div className="flex flex-col gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Button 
            onClick={togglePlay} 
            size="lg" 
            className="w-full h-12 sm:h-14 text-base sm:text-lg"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Ouvir Música
              </>
            )}
          </Button>
        </div>

          {/* CTA */}
          <div className="pt-4 sm:pt-6 border-t">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              Quer criar sua própria música personalizada?
            </p>
            <Button 
              asChild 
              variant="secondary" 
              className="w-full h-10 sm:h-11"
              onClick={() => trackEvent('cta_click')}
            >
              <Link to="/">
                Criar minha música
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
};

export default MusicShare;
