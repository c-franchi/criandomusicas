import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, ChevronLeft, ChevronRight, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";

interface AudioSample {
  id: string;
  title: string;
  description: string;
  style: string;
  occasion: string;
  audio_url: string;
  cover_url?: string;
  audio_type?: 'vocal' | 'instrumental';
}

const AudioSamples = () => {
  const { t } = useTranslation('home');
  const [samples, setSamples] = useState<AudioSample[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback samples para quando não há dados no banco
  const fallbackSamples: AudioSample[] = [
    {
      id: "1",
      title: t('audioSamples.fallback.sample1.title'),
      description: t('audioSamples.fallback.sample1.description'),
      style: t('audioSamples.fallback.sample1.style'),
      occasion: t('audioSamples.fallback.sample1.occasion'),
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop"
    },
    {
      id: "2",
      title: t('audioSamples.fallback.sample2.title'),
      description: t('audioSamples.fallback.sample2.description'),
      style: t('audioSamples.fallback.sample2.style'),
      occasion: t('audioSamples.fallback.sample2.occasion'),
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&h=300&fit=crop"
    },
    {
      id: "3",
      title: t('audioSamples.fallback.sample3.title'),
      description: t('audioSamples.fallback.sample3.description'),
      style: t('audioSamples.fallback.sample3.style'),
      occasion: t('audioSamples.fallback.sample3.occasion'),
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"
    }
  ];

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_samples')
          .select('id, title, description, style, occasion, audio_url, cover_url, audio_type')
          .eq('is_active', true)
          .eq('audio_type', 'vocal') // Only fetch vocal samples for this section
          .order('sort_order', { ascending: true })
          .limit(10);

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

  const togglePlay = (sample: AudioSample) => {
    if (!sample.audio_url) {
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
      
      const audio = new Audio(sample.audio_url);
      
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
      
      // Update progress
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime(audio.currentTime);
      }, 100);
    }
  };

  if (loading) {
    return (
      <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary/20">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Music className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary/20" id="exemplos">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <Volume2 className="w-3 h-3 mr-1" />
            {t('audioSamples.badge')}
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            {t('audioSamples.title')} 🎵
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('audioSamples.subtitle')}
          </p>
        </div>
        
        {/* Carousel for mobile-friendly display */}
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {samples.map((sample) => {
              const isPlaying = currentPlaying === sample.id;
              const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
              
              return (
                <CarouselItem key={sample.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <Card 
                    className={`overflow-hidden border-border/50 transition-all duration-500 group ${
                      isPlaying 
                        ? 'ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]' 
                        : 'hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    <div className="relative h-48">
                      <img 
                        src={sample.cover_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop"}
                        alt={`${t('audioSamples.altText')}: ${sample.title}`}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          isPlaying ? 'scale-105' : 'group-hover:scale-[1.03]'
                        }`}
                        loading="lazy"
                      />
                      <div className={`absolute inset-0 transition-all duration-300 ${
                        isPlaying 
                          ? 'bg-gradient-to-t from-primary/90 via-primary/40 to-transparent' 
                          : 'bg-gradient-to-t from-black/80 via-black/40 to-transparent'
                      }`} />
                      
                      {/* Animated sound waves when playing */}
                      {isPlaying && (
                        <div className="absolute top-4 right-4 flex items-end gap-0.5">
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '12px', animationDelay: '0ms' }} />
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '18px', animationDelay: '150ms' }} />
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '10px', animationDelay: '300ms' }} />
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '450ms' }} />
                        </div>
                      )}
                      
                      {sample.audio_url && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`absolute bottom-4 right-4 w-14 h-14 rounded-full transition-all duration-300 ${
                            isPlaying 
                              ? 'bg-white text-primary hover:bg-white/90 scale-110' 
                              : 'bg-primary hover:bg-primary/90 text-white'
                          }`}
                          onClick={() => togglePlay(sample)}
                          aria-label={isPlaying ? t('audioSamples.pause', { title: sample.title }) : t('audioSamples.play', { title: sample.title })}
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6" />
                          ) : (
                            <Play className="w-6 h-6 ml-0.5" />
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
                      
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-xs">
                          {sample.occasion}
                        </Badge>
                        
                        {/* Duration display */}
                        {isPlaying && duration > 0 && (
                          <span className="text-xs text-primary font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        )}
                      </div>
                      
                      {/* Progress bar when playing */}
                      {isPlaying && (
                        <div className="mt-2">
                          <Progress 
                            value={progress} 
                            className="h-1.5 bg-muted"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          
          {/* Navigation buttons */}
          <CarouselPrevious className="hidden md:flex -left-12 bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-white" />
          <CarouselNext className="hidden md:flex -right-12 bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-white" />
        </Carousel>
        
        {/* Mobile navigation indicators */}
        <div className="flex justify-center gap-2 mt-6 md:hidden">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            {t('audioSamples.swipeHint')}
            <ChevronRight className="w-4 h-4" />
          </p>
        </div>
      </div>
    </section>
  );
};

export default AudioSamples;
