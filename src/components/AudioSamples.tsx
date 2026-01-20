import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AudioSample {
  id: string;
  title: string;
  description: string;
  style: string;
  occasion: string;
  audio_url: string;
  cover_url?: string;
}

const AudioSamples = () => {
  const [samples, setSamples] = useState<AudioSample[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);

  // Fallback samples para quando não há dados no banco
  const fallbackSamples: AudioSample[] = [
    {
      id: "1",
      title: "Amor de Pai",
      description: "Uma homenagem emocionante de pai para filha nos seus 15 anos",
      style: "Sertanejo",
      occasion: "Aniversário",
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop"
    },
    {
      id: "2",
      title: "Nossa Jornada",
      description: "A história de amor do casal desde o primeiro encontro",
      style: "Pop Romântico",
      occasion: "Casamento",
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&h=300&fit=crop"
    },
    {
      id: "3",
      title: "Força da Fé",
      description: "Louvor personalizado para a igreja celebrar vitórias",
      style: "Worship",
      occasion: "Igreja",
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"
    }
  ];

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_samples')
          .select('id, title, description, style, occasion, audio_url, cover_url')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(6);

        if (error || !data || data.length === 0) {
          setSamples(fallbackSamples);
        } else {
          setSamples(data as AudioSample[]);
        }
      } catch {
        setSamples(fallbackSamples);
      } finally {
        setLoading(false);
      }
    };

    fetchSamples();

    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  const togglePlay = (sample: AudioSample) => {
    if (!sample.audio_url) {
      return;
    }

    if (currentPlaying === sample.id) {
      audioElement?.pause();
      setCurrentPlaying(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      
      const audio = new Audio(sample.audio_url);
      audio.onended = () => setCurrentPlaying(null);
      audio.play();
      setAudioElement(audio);
      setCurrentPlaying(sample.id);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Volume2 className="w-3 h-3 mr-1" />
            Exemplos Reais
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            Ouça músicas{" "}
            <span className="gradient-text">criadas por nós</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Confira alguns exemplos de músicas personalizadas que já criamos para nossos clientes
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {samples.map((sample) => (
            <Card 
              key={sample.id} 
              className="overflow-hidden glass-card border-border/50 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="relative h-40">
                <img 
                  src={sample.cover_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop"}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {sample.audio_url && (
                  <Button 
                    variant="glass" 
                    size="icon" 
                    className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-primary hover:bg-primary/90"
                    onClick={() => togglePlay(sample)}
                  >
                    {currentPlaying === sample.id ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </Button>
                )}
                
                <Badge className="absolute top-3 left-3 bg-primary/90">
                  {sample.style}
                </Badge>
              </div>
              
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-2">{sample.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {sample.description}
                </p>
                
                <Badge variant="outline" className="text-xs">
                  {sample.occasion}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AudioSamples;
