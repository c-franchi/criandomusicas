import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Music, 
  Play, 
  Pause, 
  Download,
  Home,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrackData {
  audio_url: string;
  title: string;
  music_style: string;
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
        // Fetch track
        const { data: trackData, error: trackError } = await supabase
          .from('tracks')
          .select('audio_url')
          .eq('order_id', orderId)
          .eq('status', 'READY')
          .maybeSingle();

        if (trackError || !trackData?.audio_url) {
          setError(true);
          setLoading(false);
          return;
        }

        // Fetch order and lyrics for title
        const { data: orderData } = await supabase
          .from('orders')
          .select('music_style, music_type, is_instrumental, approved_lyric_id')
          .eq('id', orderId)
          .single();

        let title = 'Música Personalizada';
        
        if (orderData?.approved_lyric_id) {
          const { data: lyricData } = await supabase
            .from('lyrics')
            .select('title')
            .eq('id', orderData.approved_lyric_id)
            .maybeSingle();
          
          if (lyricData?.title) {
            title = lyricData.title;
          }
        } else if (orderData?.is_instrumental) {
          title = `Instrumental ${orderData.music_type || 'Personalizado'}`;
        }

        setTrack({
          audio_url: trackData.audio_url,
          title,
          music_style: orderData?.music_style || ''
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

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const downloadTrack = () => {
    if (!track?.audio_url) return;
    
    const sanitizedTitle = track.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 50);
    
    const link = document.createElement('a');
    link.href = track.audio_url;
    link.download = `${sanitizedTitle}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted p-4 safe-area-inset">
      <Card className="p-6 sm:p-8 max-w-md w-full text-center mx-auto">
        {/* Logo/Brand */}
        <div className="mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Music className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
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
                Pausar
              </>
            ) : (
              <>
                <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Ouvir Música
              </>
            )}
          </Button>
          
          <Button 
            onClick={downloadTrack} 
            variant="outline" 
            size="lg"
            className="w-full h-11 sm:h-12"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Baixar MP3
          </Button>
        </div>

        {/* CTA */}
        <div className="pt-4 sm:pt-6 border-t">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
            Quer criar sua própria música personalizada?
          </p>
          <Button asChild variant="secondary" className="w-full h-10 sm:h-11">
            <Link to="/">
              Criar minha música
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MusicShare;
