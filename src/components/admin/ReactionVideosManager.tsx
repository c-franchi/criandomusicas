import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Video,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  User,
  Globe,
  Lock,
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReactionVideo {
  id: string;
  user_id: string;
  order_id: string | null;
  video_url: string;
  thumbnail_url: string | null;
  is_approved: boolean;
  is_public: boolean;
  created_at: string;
  user_name?: string | null;
  music_title?: string | null;
}

const ReactionVideosManager = () => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<ReactionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<ReactionVideo | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filterApproved, setFilterApproved] = useState<'all' | 'pending' | 'approved'>('all');

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data: videosData, error } = await supabase
        .from('reaction_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch additional data
      const videosWithDetails = await Promise.all(
        (videosData || []).map(async (video) => {
          let user_name = null;
          let music_title = null;

          // Fetch user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', video.user_id)
            .maybeSingle();
          user_name = profileData?.name;

          // Fetch music title
          if (video.order_id) {
            const { data: orderData } = await supabase
              .from('orders')
              .select('approved_lyric_id, music_type')
              .eq('id', video.order_id)
              .maybeSingle();
            
            if (orderData?.approved_lyric_id) {
              const { data: lyricData } = await supabase
                .from('lyrics')
                .select('title')
                .eq('id', orderData.approved_lyric_id)
                .maybeSingle();
              music_title = lyricData?.title || `Música ${orderData.music_type}`;
            } else {
              music_title = `Música ${orderData?.music_type || 'Personalizada'}`;
            }
          }

          return { ...video, user_name, music_title };
        })
      );

      setVideos(videosWithDetails);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar vídeos de reação',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const updateVideo = async (id: string, updates: { is_approved?: boolean; is_public?: boolean }) => {
    try {
      const { error } = await supabase
        .from('reaction_videos')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Vídeo atualizado!',
        description: updates.is_approved !== undefined 
          ? (updates.is_approved ? 'Vídeo aprovado para exibição' : 'Vídeo reprovado')
          : 'Visibilidade alterada',
      });

      setVideos(prev => prev.map(v => 
        v.id === id ? { ...v, ...updates } : v
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao atualizar vídeo',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const filteredVideos = videos.filter(video => {
    if (filterApproved === 'pending') return !video.is_approved;
    if (filterApproved === 'approved') return video.is_approved;
    return true;
  });

  const pendingCount = videos.filter(v => !v.is_approved).length;
  const approvedCount = videos.filter(v => v.is_approved).length;
  const publicCount = videos.filter(v => v.is_approved && v.is_public).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center bg-card/50">
          <p className="text-2xl font-bold">{videos.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3 text-center bg-orange-500/10 border-orange-500/30">
          <p className="text-2xl font-bold text-orange-400">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </Card>
        <Card className="p-3 text-center bg-green-500/10 border-green-500/30">
          <p className="text-2xl font-bold text-green-400">{publicCount}</p>
          <p className="text-xs text-muted-foreground">Na Homepage</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'pending', label: `Pendentes (${pendingCount})` },
            { value: 'approved', label: `Aprovados (${approvedCount})` },
          ].map((item) => (
            <Button
              key={item.value}
              variant={filterApproved === item.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterApproved(item.value as any)}
              className="text-xs"
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={fetchVideos} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Videos List */}
      {loading ? (
        <div className="text-center py-8">
          <Video className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <Card className="p-8 text-center">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum vídeo de reação</h3>
          <p className="text-sm text-muted-foreground">
            Os clientes podem enviar vídeos de reação na página do pedido
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredVideos.map((video) => (
            <Card key={video.id} className={`p-3 bg-card/50 border-border/50 ${!video.is_approved ? 'border-orange-500/30' : ''}`}>
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div 
                  className="relative w-24 h-24 shrink-0 bg-muted rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => {
                    setSelectedVideo(video);
                    setPreviewOpen(true);
                  }}
                >
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    {video.is_approved ? (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprovado
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                        Pendente
                      </Badge>
                    )}
                    {video.is_public && video.is_approved && (
                      <Badge variant="outline" className="text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        Público
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm font-medium truncate">
                    {video.music_title || 'Música Personalizada'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <User className="w-3 h-3" />
                    <span className="truncate">{video.user_name || 'Usuário'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(video.created_at).toLocaleDateString('pt-BR')}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    {!video.is_approved ? (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => updateVideo(video.id, { is_approved: true, is_public: true })}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive border-destructive/50"
                          onClick={() => updateVideo(video.id, { is_approved: false, is_public: false })}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`public-${video.id}`}
                          checked={video.is_public}
                          onCheckedChange={(checked) => updateVideo(video.id, { is_public: checked })}
                        />
                        <Label htmlFor={`public-${video.id}`} className="text-xs cursor-pointer">
                          {video.is_public ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <Globe className="w-3 h-3" /> Na Homepage
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Lock className="w-3 h-3" /> Oculto
                            </span>
                          )}
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Video Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Vídeo de Reação
            </DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <video
                src={selectedVideo.video_url}
                controls
                autoPlay
                className="w-full rounded-lg"
              />
              <div className="text-sm space-y-1">
                <p><strong>Cliente:</strong> {selectedVideo.user_name || 'Anônimo'}</p>
                <p><strong>Música:</strong> {selectedVideo.music_title || 'Música Personalizada'}</p>
                <p><strong>Data:</strong> {new Date(selectedVideo.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReactionVideosManager;
