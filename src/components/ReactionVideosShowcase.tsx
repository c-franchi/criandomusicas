import { useEffect, useState } from "react";
import { Heart, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ReactionVideo {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
}

const ReactionVideosShowcase = () => {
  const [videos, setVideos] = useState<ReactionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [mutedId, setMutedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data, error } = await supabase
          .from('reaction_videos')
          .select('id, video_url, thumbnail_url')
          .eq('is_approved', true)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;
        setVideos(data || []);
      } catch (error) {
        console.error('Error fetching reaction videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading || videos.length === 0) {
    return null;
  }

  const handlePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  const handleMute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedId(mutedId === id ? null : id);
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-pink-500/20 text-pink-400 border-pink-500/30">
            <Heart className="w-3 h-3 mr-1" />
            Reações Reais
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Veja a <span className="text-primary">Emoção</span> de Quem Recebeu
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Assista às reações de pessoas que foram surpreendidas com músicas personalizadas
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card 
              key={video.id} 
              className="relative overflow-hidden aspect-[9/16] cursor-pointer group"
              onClick={() => handlePlay(video.id)}
            >
              {playingId === video.id ? (
                <div className="relative w-full h-full">
                  <video
                    src={video.video_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted={mutedId === video.id}
                    playsInline
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="h-8 w-8"
                      onClick={(e) => handleMute(video.id, e)}
                    >
                      {mutedId === video.id ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setPlayingId(null); }}
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt="Reação" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Heart className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" />
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReactionVideosShowcase;
