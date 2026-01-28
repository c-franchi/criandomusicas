import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Music, Piano } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface InstrumentalSample {
  id: string;
  title: string;
  description: string;
  style: string;
  occasion: string;
  audioUrl?: string;
  coverUrl: string;
}

// Fallback samples
const fallbackSamples: InstrumentalSample[] = [
  {
    id: "inst-1",
    title: "Serenata ao Luar",
    description: "Piano solo melancólico com toques de jazz, perfeito para momentos de reflexão",
    style: "Jazz",
    occasion: "Melancólico",
    coverUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop"
  },
  {
    id: "inst-2",
    title: "Alma Brasileira",
    description: "Violão clássico com influências de bossa nova e MPB contemporânea",
    style: "MPB",
    occasion: "Romântico",
    coverUrl: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=300&fit=crop"
  },
  {
    id: "inst-3",
    title: "Horizonte Infinito",
    description: "Orquestra épica com solo de violino, ideal para vídeos e apresentações",
    style: "Clássico",
    occasion: "Épico",
    coverUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop"
  }
];

const InstrumentalShowcase = () => {
  const { t } = useTranslation('home');
  const [samples, setSamples] = useState<InstrumentalSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_samples')
          .select('id, title, description, style, occasion, audio_url, cover_url')
          .eq('is_active', true)
          .eq('audio_type', 'instrumental')
          .order('sort_order', { ascending: true })
          .limit(10);

        if (error || !data || data.length === 0) {
          setSamples(fallbackSamples);
        } else {
          // Map database fields to component interface
          const mappedSamples = data.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            style: item.style,
            occasion: item.occasion,
            audioUrl: item.audio_url,
            coverUrl: item.cover_url || "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop"
          }));
          setSamples(mappedSamples);
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
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = (sample: InstrumentalSample) => {
    if (!sample.audioUrl) {
      // Demo mode - just toggle visual state
      if (currentPlaying === sample.id) {
        setCurrentPlaying(null);
      } else {
        setCurrentPlaying(sample.id);
      }
      return;
    }

    if (currentPlaying === sample.id) {
      audioElement?.pause();
      setCurrentPlaying(null);
      setCurrentTime(0);
      setDuration(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      const audio = new Audio(sample.audioUrl);
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
      
      audio.onended = () => {
        setCurrentPlaying(null);
        setCurrentTime(0);
        setDuration(0);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
      
      audio.play();
      setAudioElement(audio);
      setCurrentPlaying(sample.id);
      
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime(audio.currentTime);
      }, 100);
    }
  };

  if (loading) {
    return (
      <section className="py-24 px-6 bg-gradient-to-b from-secondary/20 to-background">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Piano className="w-8 h-8 animate-spin text-accent" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-secondary/20 to-background" id="instrumentais">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
            <Piano className="w-3 h-3 mr-1" />
            {t('instrumental.badge')}
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            {t('instrumental.title')}{" "}
            <span className="gradient-text">{t('instrumental.titleHighlight')}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('instrumental.subtitle')}
          </p>
        </div>
        
        {/* Single Marquee Row */}
        <Marquee direction="right" speed="normal" pauseOnHover>
          {samples.map((sample) => {
            const isPlaying = currentPlaying === sample.id;
            const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
            
            return (
              <Card 
                key={sample.id}
                className={`overflow-hidden border-border/50 transition-all duration-300 group w-[300px] md:w-[340px] flex-shrink-0 ${
                  isPlaying 
                    ? 'ring-2 ring-accent shadow-lg shadow-accent/20' 
                    : 'hover:border-accent/50 hover:shadow-md'
                }`}
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={sample.coverUrl}
                    alt={`Música instrumental ${sample.style}: ${sample.title} - ${sample.description}`}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isPlaying ? 'scale-105' : 'group-hover:scale-[1.03]'
                    }`}
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 transition-all duration-300 ${
                    isPlaying 
                      ? 'bg-gradient-to-t from-accent/90 via-accent/40 to-transparent' 
                      : 'bg-gradient-to-t from-black/80 via-black/40 to-transparent'
                  }`} />
                  
                  {isPlaying && (
                    <div className="absolute top-4 right-4 flex items-end gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <div 
                          key={i}
                          className="w-1 bg-white rounded-full animate-pulse" 
                          style={{ 
                            height: `${8 + Math.random() * 12}px`, 
                            animationDelay: `${i * 100}ms`,
                            animationDuration: '0.5s'
                          }} 
                        />
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`absolute bottom-4 right-4 w-14 h-14 rounded-full transition-all duration-300 ${
                      isPlaying 
                        ? 'bg-white text-accent hover:bg-white/90 scale-110' 
                        : 'bg-accent hover:bg-accent/90 text-white'
                    }`}
                    onClick={() => togglePlay(sample)}
                    aria-label={isPlaying ? `Pausar ${sample.title}` : `Reproduzir ${sample.title}`}
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </Button>
                  
                  <Badge className="absolute top-3 left-3 bg-accent/90">
                    🎹 {sample.style}
                  </Badge>
                </div>
                
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-2">{sample.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{sample.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{sample.occasion}</Badge>
                    {isPlaying && duration > 0 && (
                      <span className="text-xs text-accent font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    )}
                  </div>
                  
                  {isPlaying && (
                    <div className="mt-3">
                      <Progress value={progress} className="h-1.5 bg-muted [&>div]:bg-accent" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </Marquee>
        
        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            💰 {t('instrumental.discount').replace('20%', '')} <span className="text-accent font-semibold">{t('instrumental.discountBadge')}</span>
          </p>
          <Button 
            variant="outline" 
            className="border-accent/50 hover:bg-accent hover:text-white"
            onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Music className="w-4 h-4 mr-2" />
            {t('instrumental.cta')}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default InstrumentalShowcase;