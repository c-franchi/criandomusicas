import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Music, 
  Play, 
  Pause, 
  Loader2,
  Sparkles,
  Shield
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
  const { t, i18n } = useTranslation('common');
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const [track, setTrack] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Apply language from URL parameter if present
  useEffect(() => {
    const langParam = searchParams.get('lang');
    if (langParam && ['pt-BR', 'en', 'es', 'it'].includes(langParam)) {
      i18n.changeLanguage(langParam);
    }
  }, [searchParams, i18n]);

  useEffect(() => {
    const fetchTrack = async () => {
      if (!orderId) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
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
          title: data.title || t('share.defaultTitle'),
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
  }, [orderId, t]);

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
          <p className="text-muted-foreground">{t('share.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="p-8 text-center max-w-md">
          <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">{t('share.notFound')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('share.notFoundDesc')}
          </p>
          <Button asChild>
            <Link to="/">
              <Sparkles className="w-4 h-4 mr-2" />
              {t('share.createOwn')}
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const ogImage = track.cover_url || 'https://criandomusicas.com.br/og-image.jpg';
  const pageTitle = `${track.title} | Criando Músicas`;
  const pageDescription = `${t('share.listenTo')} "${track.title}" - ${t('share.personalizedMusic')}. ${track.music_style ? `${t('share.style')}: ${track.music_style}` : ''}`;

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
                alt={`${t('share.coverOf')} ${track.title}`}
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover mx-auto mb-3 sm:mb-4 shadow-2xl ring-4 ring-primary/20"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Music className="w-12 h-12 sm:w-14 sm:h-14 text-primary" />
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

        {/* Player Controls */}
        <div className="flex flex-col gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Button 
            onClick={togglePlay} 
            size="lg" 
            className="w-full h-12 sm:h-14 text-base sm:text-lg"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                {t('share.pause')}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                {t('share.listen')}
              </>
            )}
          </Button>
        </div>

          {/* CTA */}
          <div className="pt-4 sm:pt-6 border-t space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>Site oficial verificado</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {t('share.wantToCreate')}
            </p>
            <Button 
              asChild 
              variant="hero" 
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold shadow-lg"
              onClick={() => trackEvent('cta_click')}
            >
              <Link to="/">
                <Sparkles className="w-5 h-5 mr-2" />
                {t('share.createOwn')}
              </Link>
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Grátis para começar • Sem compromisso
            </p>
          </div>
        </Card>
      </div>
    </>
  );
};

export default MusicShare;
