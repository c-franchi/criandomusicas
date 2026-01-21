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
  MessageCircle
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

  const shareOnWhatsApp = () => {
    const title = order?.is_instrumental 
      ? `Instrumental ${order?.music_type || 'Personalizado'}`
      : (lyrics.find(l => l.is_approved)?.title || 'Minha Música Personalizada');
    
    // Use short shareable URL with song name
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/m/${orderId}`;
    const text = `🎵 Ouça minha música: ${title}\n\n🎧 Escute aqui:\n${shareUrl}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
                  <h3 className="text-xl font-bold mb-1">{approvedLyric?.title || 'Música Personalizada'}</h3>
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

              {/* Share */}
              <div className="pt-4 border-t border-border/50">
                <Button 
                  onClick={shareOnWhatsApp}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar no WhatsApp
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

            <Button 
              onClick={shareOnWhatsApp}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Compartilhar
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
                  R$ {((order.amount || 1990) / 100).toFixed(2).replace('.', ',')}
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
