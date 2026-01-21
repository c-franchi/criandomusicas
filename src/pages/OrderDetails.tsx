import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  Music, 
  ArrowLeft,
  Download,
  Play,
  Pause,
  ExternalLink,
  Share2,
  FileText,
  MessageCircle,
  Video,
  Camera
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReviewForm from "@/components/ReviewForm";

interface OrderData {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  music_type: string;
  music_style: string;
  story: string;
  approved_lyric_id: string | null;
  amount: number;
  user_id: string;
  is_instrumental: boolean | null;
  instruments: string[] | null;
  solo_instrument: string | null;
  solo_moment: string | null;
  instrumentation_notes: string | null;
}

interface LyricData {
  id: string;
  title: string;
  body: string;
  version: string;
  is_approved: boolean;
}

interface TrackData {
  id: string;
  audio_url: string;
  status: string;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  is_public: boolean;
}

const OrderDetails = () => {
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [lyrics, setLyrics] = useState<LyricData[]>([]);
  const [track, setTrack] = useState<TrackData | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const fetchReview = useCallback(async () => {
    if (!orderId) return;
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, is_public')
      .eq('order_id', orderId)
      .maybeSingle();
    setReview(data);
  }, [orderId]);

  // Fetch order data
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!user?.id || !orderId) return;

      try {
        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError) throw orderError;
        setOrder(orderData);

        // Fetch lyrics
        const { data: lyricsData } = await supabase
          .from('lyrics')
          .select('*')
          .eq('order_id', orderId)
          .order('version', { ascending: true });

        setLyrics(lyricsData || []);

        // Fetch track
        const { data: trackData } = await supabase
          .from('tracks')
          .select('*')
          .eq('order_id', orderId)
          .eq('status', 'READY')
          .maybeSingle();

        setTrack(trackData);

        // Fetch existing review
        await fetchReview();
      } catch (err) {
        console.error('Error fetching order:', err);
        toast({
          title: 'Erro ao carregar pedido',
          description: 'Tente novamente mais tarde',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrderData();
    }
  }, [user, orderId, toast, fetchReview]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!user?.id || !orderId) return;

    const orderChannel = supabase
      .channel(`order-details-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Order updated:', payload);
          setOrder(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    const trackChannel = supabase
      .channel(`track-details-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracks',
          filter: `order_id=eq.${orderId}`
        },
        async (payload) => {
          console.log('Track updated:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTrack = payload.new as TrackData;
            if (newTrack.status === 'READY') {
              setTrack(newTrack);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(trackChannel);
    };
  }, [user?.id, orderId]);

  // Audio controls
  const togglePlay = () => {
    if (!track?.audio_url) return;

    if (!audioElement) {
      const audio = new Audio(track.audio_url);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  const downloadTrack = () => {
    if (!track?.audio_url) return;
    
    // Get the song title - prioritize approved lyrics title, then instrumental name
    const songTitle = order?.is_instrumental 
      ? `Instrumental ${order?.music_type || 'Personalizado'}`
      : (lyrics.find(l => l.is_approved)?.title || 'Minha Música');
    
    // Sanitize filename: remove special characters and replace spaces with hyphens
    const sanitizedTitle = songTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase()
      .slice(0, 50); // Limit length
    
    const link = document.createElement('a');
    link.href = track.audio_url;
    link.download = `${sanitizedTitle}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Download iniciado!' });
  };

  // Get the actual song title for sharing
  const getSongTitle = () => {
    if (order?.is_instrumental) {
      return `Instrumental ${order?.music_type || 'Personalizado'}`;
    }
    return lyrics.find(l => l.is_approved)?.title || 'Minha Música Personalizada';
  };

  const getShareUrl = () => `https://criandomusicas.com.br/m/${orderId}`;

  const shareOnWhatsApp = () => {
    const title = getSongTitle();
    const shareUrl = getShareUrl();
    const text = `🎵 Ouça minha música personalizada: ${title}\n\n🎧 Escute aqui:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnFacebook = () => {
    const shareUrl = getShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnInstagram = () => {
    // Instagram doesn't have a direct share URL, copy link and open Instagram
    navigator.clipboard.writeText(getShareUrl());
    toast({ title: 'Link copiado!', description: 'Cole no seu Instagram para compartilhar.' });
    window.open('https://www.instagram.com/', '_blank');
  };

  const shareAll = async () => {
    const title = getSongTitle();
    const shareUrl = getShareUrl();
    const text = `🎵 Ouça minha música personalizada: ${title}\n\n🎧 Escute aqui: ${shareUrl}`;
    
    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🎵 ${title}`,
          text: `Ouça minha música personalizada: ${title}`,
          url: shareUrl
        });
        return;
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    }
    
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text);
    toast({ title: 'Link copiado!', description: 'Compartilhe em suas redes sociais!' });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!order) {
    return <Navigate to="/dashboard" replace />;
  }

  const getStatusInfo = () => {
    const statusMap: Record<string, { text: string; progress: number; color: string }> = {
      'DRAFT': { text: 'Rascunho', progress: 10, color: 'text-muted-foreground' },
      'AWAITING_PAYMENT': { text: 'Aguardando Pagamento', progress: 15, color: 'text-orange-500' },
      'LYRICS_PENDING': { text: 'Gerando Letras...', progress: 30, color: 'text-blue-500' },
      'LYRICS_GENERATED': { text: 'Letras Prontas', progress: 45, color: 'text-purple-500' },
      'LYRICS_APPROVED': { text: 'Letras Aprovadas', progress: 60, color: 'text-indigo-500' },
      'MUSIC_GENERATING': { text: 'Produzindo Música...', progress: 75, color: 'text-yellow-500' },
      'MUSIC_READY': { text: 'Música Pronta!', progress: 95, color: 'text-green-500' },
      'COMPLETED': { text: 'Entregue', progress: 100, color: 'text-green-600' }
    };

    if (order.payment_status === 'AWAITING_PIX') {
      return { text: 'Aguardando PIX', progress: 15, color: 'text-yellow-500' };
    }

    return statusMap[order.status] || { text: order.status, progress: 0, color: 'text-muted-foreground' };
  };

  const statusInfo = getStatusInfo();
  const approvedLyric = lyrics.find(l => l.is_approved);
  const isMusicReady = order.status === 'MUSIC_READY' || order.status === 'COMPLETED';

  const isInstrumental = order.is_instrumental === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {isInstrumental ? `Instrumental ${order.music_type}` : (approvedLyric?.title || `Música ${order.music_type}`)}
              </h1>
              {isInstrumental && (
                <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">
                  🎹 Instrumental
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {order.music_style} • Pedido #{orderId?.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {isMusicReady ? (
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div>
                  <Badge className={statusInfo.color}>{statusInfo.text}</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isMusicReady ? 'Sua música está pronta para ouvir!' : 'Acompanhe o progresso'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-primary">{statusInfo.progress}%</span>
              </div>
            </div>
            <Progress value={statusInfo.progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Music Player - Show when ready */}
        {isMusicReady && track?.audio_url && (
          <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Music className="w-5 h-5" />
                Sua Música
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Album Art & Controls */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
                  <Music className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{getSongTitle()}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{order.music_style}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={togglePlay}
                      size="default"
                      className="gap-2 flex-1 min-w-[120px]"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? 'Pausar' : 'Ouvir'}
                    </Button>
                    <Button 
                      onClick={downloadTrack}
                      variant="outline"
                      size="default"
                      className="gap-2 flex-1 min-w-[120px]"
                    >
                      <Download className="w-4 h-4" />
                      Baixar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Share Options */}
              <div className="pt-4 border-t border-border/50 space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-2">Compartilhar sua música:</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={shareOnWhatsApp}
                    variant="outline"
                    className="gap-2 flex-col h-auto py-3"
                    title="Compartilhar no WhatsApp"
                  >
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="text-xs">WhatsApp</span>
                  </Button>
                  <Button 
                    onClick={shareOnFacebook}
                    variant="outline"
                    className="gap-2 flex-col h-auto py-3"
                    title="Compartilhar no Facebook"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="text-xs">Facebook</span>
                  </Button>
                  <Button 
                    onClick={shareOnInstagram}
                    variant="outline"
                    className="gap-2 flex-col h-auto py-3"
                    title="Compartilhar no Instagram"
                  >
                    <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className="text-xs">Instagram</span>
                  </Button>
                </div>
                <Button 
                  onClick={shareAll}
                  className="w-full gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar em Todas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Form - Show when music is ready */}
        {isMusicReady && user && (
          <ReviewForm
            orderId={orderId!}
            userId={user.id}
            existingReview={review || undefined}
            onReviewSubmitted={fetchReview}
          />
        )}

        {/* Instruments Section - Show for instrumental orders */}
        {isInstrumental && order.instruments && order.instruments.length > 0 && (
          <Card className="border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                🎹 Instrumentação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Instrumentos selecionados:</p>
                <div className="flex flex-wrap gap-2">
                  {order.instruments.map((instrument, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-purple-500/10 text-purple-600">
                      {instrument}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {order.solo_instrument && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Solo de instrumento:</p>
                  <p className="font-medium">{order.solo_instrument} ({order.solo_moment || 'meio'})</p>
                </div>
              )}
              
              {order.instrumentation_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{order.instrumentation_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lyrics Section - Hide for instrumental orders */}
        {!isInstrumental && approvedLyric && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Letra Aprovada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-lg mb-3">{approvedLyric.title}</h3>
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm max-h-[400px] overflow-y-auto">
                {approvedLyric.body}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link to={`/acompanhar/${orderId}`}>
                <Clock className="w-4 h-4" />
                Acompanhar em Tempo Real
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Link>
            </Button>
            
            {(order.status === 'LYRICS_GENERATED') && (
              <Button asChild className="w-full justify-start gap-2">
                <Link to={`/criar-musica?orderId=${orderId}`}>
                  <Music className="w-4 h-4" />
                  Escolher Letra
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </Link>
              </Button>
            )}

            {isMusicReady && (
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to={`/video-checkout/${orderId}`}>
                  <Video className="w-4 h-4" />
                  Criar Vídeo Personalizado
                  <Badge variant="secondary" className="ml-auto text-xs">R$ 50</Badge>
                </Link>
              </Button>
            )}

            <Button 
              onClick={shareAll}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar nas Redes
            </Button>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">{order.music_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estilo</p>
                <p className="font-medium">{order.music_style}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-medium">
                  R$ {(order.amount / 100).toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
            
            {order.story && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-muted-foreground text-sm mb-2">História</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{order.story}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderDetails;
