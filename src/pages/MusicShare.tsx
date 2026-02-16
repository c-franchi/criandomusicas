import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Music, 
  Play, 
  Pause, 
  Loader2,
  Sparkles,
  Shield,
  Clock,
  Gift,
  Zap,
  Share2,
  PenTool
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import PreviewBanner from "@/components/PreviewBanner";
import PreviewCompletedModal from "@/components/PreviewCompletedModal";

interface TrackData {
  audio_url: string;
  title: string;
  music_style: string;
  cover_url: string | null;
  is_preview?: boolean;
  version?: number;
}

const MusicShare = () => {
  const { t, i18n } = useTranslation(['common', 'briefing']);
  const { orderId, version } = useParams();
  const [searchParams] = useSearchParams();
  const [track, setTrack] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [totalSongs, setTotalSongs] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const trackVersion = version ? parseInt(version, 10) : 1;

  useEffect(() => {
    const langParam = searchParams.get('lang');
    if (langParam && ['pt-BR', 'en', 'es', 'it'].includes(langParam)) {
      i18n.changeLanguage(langParam);
    }
  }, [searchParams, i18n]);

  // Fetch total songs for social proof
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['MUSIC_READY', 'COMPLETED']);
        setTotalSongs(count || 500);
      } catch {
        setTotalSongs(500);
      }
    };
    fetchCount();
  }, []);

  useEffect(() => {
    const fetchTrack = async () => {
      if (!orderId) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-track?orderId=${orderId}&version=${trackVersion}`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            }
          }
        );

        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (!data?.audio_url) {
          setError(true);
          setLoading(false);
          return;
        }

        setTrack({
          audio_url: data.audio_url,
          title: data.title || t('common:share.defaultTitle'),
          music_style: data.music_style || '',
          cover_url: data.cover_url || null,
          is_preview: data.is_preview || false,
          version: trackVersion
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTrack();
  }, [orderId, trackVersion, t]);

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

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (track?.is_preview) {
      setShowPreviewModal(true);
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
          <h1 className="text-xl font-bold mb-2">{t('common:share.notFound')}</h1>
          <p className="text-muted-foreground mb-6">{t('common:share.notFoundDesc')}</p>
          <Button asChild>
            <Link to="/">
              <Sparkles className="w-4 h-4 mr-2" />
              {t('common:share.createOwn')}
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const ogImage = track.cover_url || 'https://criandomusicas.com.br/og-image.jpg';
  const versionLabel = trackVersion === 2 ? ' (Versão 2)' : '';
  const pageTitle = `${track.title}${versionLabel} | Criando Músicas`;
  const pageDescription = `${t('common:share.listenTo')} "${track.title}"${versionLabel} - ${t('common:share.personalizedMusic')}. ${track.music_style ? `${t('common:share.style')}: ${track.music_style}` : ''}`;

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

      <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-background via-background to-muted p-4 pt-8 safe-area-inset">
        <div className="max-w-md w-full space-y-6">
          
          {/* Main Card - Player */}
          <Card className="p-6 sm:p-8 text-center">
            {/* Cover Image or Logo */}
            <div className="mb-4 sm:mb-6">
              {track.cover_url ? (
                <img 
                  src={track.cover_url} 
                  alt={`${t('share.coverOf')} ${track.title}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover mx-auto mb-3 shadow-2xl ring-4 ring-primary/20"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Music className="w-12 h-12 sm:w-14 sm:h-14 text-primary" />
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                Criando Músicas
              </p>
            </div>

            {/* Track Info */}
            <h1 className="text-xl sm:text-2xl font-bold mb-1 break-words px-2">
              {track.title}
              {trackVersion === 2 && (
                <Badge variant="outline" className="ml-2 text-xs">V2</Badge>
              )}
            </h1>
            {track.music_style && (
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">{track.music_style}</p>
            )}

            {/* Emotional headline */}
            <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed">
              Essa música foi criada em menos de 2 minutos com inteligência artificial.
              <br />
              <span className="text-primary font-medium">Agora imagine a sua história aqui.</span>
            </p>

            {/* Audio Element */}
            <audio 
              ref={audioRef} 
              src={track.audio_url}
              onEnded={handleAudioEnded}
              preload="metadata"
            />

            {/* Preview Badge */}
            {track.is_preview && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Você está ouvindo uma prévia de uma música 100% personalizada criada com IA.
                </p>
                <PreviewBanner variant="info" />
              </div>
            )}

            {/* Player Controls */}
            <div className="flex flex-col gap-3 mb-4">
              <Button 
                onClick={togglePlay} 
                size="lg" 
                className="w-full h-12 sm:h-14 text-base sm:text-lg"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    {t('common:share.pause')}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    {t('common:share.listen')}
                  </>
                )}
              </Button>
            </div>

            {/* PRIMARY CTA - Right below player */}
            <div className="space-y-2">
              <Button 
                asChild 
                variant="hero"
                className="w-full h-14 text-lg font-bold shadow-lg bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400"
                onClick={() => trackEvent('cta_click')}
              >
                <Link to="/auth">
                  <Gift className="w-5 h-5 mr-2" />
                  🎁 Criar minha música grátis
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                1 crédito gratuito. Sem cartão. Sem compromisso.
              </p>
            </div>
          </Card>

          {/* Benefits Section */}
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <PenTool className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Letra personalizada</p>
                  <p className="text-xs text-muted-foreground">Com a sua história</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Music className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Escolha o estilo</p>
                  <p className="text-xs text-muted-foreground">+15 gêneros</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Pronta em minutos</p>
                  <p className="text-xs text-muted-foreground">IA avançada</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Share2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Fácil de compartilhar</p>
                  <p className="text-xs text-muted-foreground">Um link e pronto</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Social Proof */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className="text-yellow-500 text-lg">⭐</span>
              ))}
            </div>
            <p className="text-sm font-medium text-foreground">
              Mais de {totalSongs ? `${totalSongs}+` : '500+'} músicas já criadas e compartilhadas.
            </p>
          </div>

          {/* Bottom CTA */}
          <Card className="p-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>Site oficial verificado</span>
            </div>
            
            <Button 
              asChild 
              variant="hero" 
              className="w-full h-14 text-lg font-bold shadow-lg"
              onClick={() => trackEvent('cta_click')}
            >
              <Link to="/auth">
                <Sparkles className="w-5 h-5 mr-2" />
                🔥 Transformar minha história em música
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Comece agora com 1 crédito grátis.
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              Crédito gratuito disponível para novos usuários.
            </p>
          </Card>

          <PreviewCompletedModal 
            open={showPreviewModal} 
            onOpenChange={setShowPreviewModal}
          />
        </div>
      </div>
    </>
  );
};

export default MusicShare;
