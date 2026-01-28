import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Marquee } from "@/components/ui/marquee";
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

// Audio Sample Card Component
interface AudioSampleCardProps {
  sample: AudioSample;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  formatTime: (seconds: number) => string;
}

const AudioSampleCard = ({ 
  sample, 
  isPlaying, 
  progress, 
  currentTime, 
  duration, 
  onTogglePlay,
  formatTime 
}: AudioSampleCardProps) => {
  const { t } = useTranslation('home');
  
  return (
    <Card 
      className={`premium-card overflow-hidden transition-all duration-500 group w-[300px] md:w-[340px] flex-shrink-0 ${
        isPlaying 
          ? 'ring-2 ring-primary shadow-xl' 
          : ''
      }`}
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={sample.cover_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop"}
          alt={`${t('samples.playButton')}: ${sample.title}`}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isPlaying ? 'scale-110' : 'group-hover:scale-105'
          }`}
          loading="lazy"
        />
        <div className={`absolute inset-0 transition-all duration-300 ${
          isPlaying 
            ? 'bg-gradient-to-t from-primary/90 via-primary/40 to-transparent' 
            : 'bg-gradient-to-t from-background/90 via-background/40 to-transparent'
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
            className={`absolute bottom-4 right-4 w-14 h-14 rounded-full transition-all duration-300 shadow-xl ${
              isPlaying 
                ? 'bg-white text-primary hover:bg-white/90 scale-110' 
                : 'bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            aria-label={isPlaying ? t('samples.pauseButton') : t('samples.playButton')}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </Button>
        )}
        
        <Badge className="absolute top-3 left-3 bg-gradient-to-r from-primary to-accent text-white border-0 shadow-lg">
          {sample.style}
        </Badge>
      </div>
      
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2 text-foreground">{sample.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
          {sample.description}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs border-primary/30">
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
  );
};

const AudioSamples = () => {
  const { t } = useTranslation('home');
  const [samples, setSamples] = useState<AudioSample[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback samples
  const fallbackSamples: AudioSample[] = [
    {
      id: "1",
      title: t('samples.fallback.sample1.title', 'Tribute Song'),
      description: t('samples.fallback.sample1.description', 'A special tribute for an unforgettable moment'),
      style: t('samples.fallback.sample1.style', 'Pop'),
      occasion: t('samples.fallback.sample1.occasion', 'Birthday'),
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop"
    },
    {
      id: "2",
      title: t('samples.fallback.sample2.title', 'Motivational Song'),
      description: t('samples.fallback.sample2.description', 'An inspiring track to lift your spirits'),
      style: t('samples.fallback.sample2.style', 'Rock'),
      occasion: t('samples.fallback.sample2.occasion', 'Motivational'),
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&h=300&fit=crop"
    },
    {
      id: "3",
      title: t('samples.fallback.sample3.title', 'Romantic Song'),
      description: t('samples.fallback.sample3.description', 'A beautiful melody to express love'),
      style: t('samples.fallback.sample3.style', 'Bossa Nova'),
      occasion: t('samples.fallback.sample3.occasion', 'Wedding'),
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"
    },
    {
      id: "4",
      title: t('samples.fallback.sample1.title', 'Tribute Song'),
      description: t('samples.fallback.sample1.description', 'A special tribute for an unforgettable moment'),
      style: "Sertanejo",
      occasion: t('samples.fallback.sample1.occasion', 'Birthday'),
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop"
    },
    {
      id: "5",
      title: t('samples.fallback.sample2.title', 'Motivational Song'),
      description: t('samples.fallback.sample2.description', 'An inspiring track to lift your spirits'),
      style: "Gospel",
      occasion: "Homenagem",
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop"
    },
    {
      id: "6",
      title: t('samples.fallback.sample3.title', 'Romantic Song'),
      description: t('samples.fallback.sample3.description', 'A beautiful melody to express love'),
      style: "MPB",
      occasion: "Declaração",
      audio_url: "",
      cover_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop"
    }
  ];

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_samples')
          .select('id, title, description, style, occasion, audio_url, cover_url, audio_type')
          .eq('is_active', true)
          .eq('audio_type', 'vocal')
          .order('sort_order', { ascending: true })
          .limit(12);

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
      
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime(audio.currentTime);
      }, 100);
    }
  };


  if (loading) {
    return (
      <section className="section-spacing gradient-section">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Music className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="section-spacing gradient-section overflow-hidden" id="exemplos">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-12 px-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="outline" className="mb-4 px-4 py-2 border-primary/30 bg-primary/5">
            <Volume2 className="w-4 h-4 mr-2 text-primary" />
            <span className="text-primary font-medium">{t('samples.badge')}</span>
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t('samples.title')} <span className="gradient-text">🎵</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('samples.subtitle')}
          </p>
        </motion.div>
        
        {/* Single Marquee Row */}
        <Marquee direction="left" speed="normal" pauseOnHover>
          {samples.map((sample) => {
            const isPlaying = currentPlaying === sample.id;
            const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
            
            return (
              <AudioSampleCard
                key={sample.id}
                sample={sample}
                isPlaying={isPlaying}
                progress={progress}
                currentTime={currentTime}
                duration={duration}
                onTogglePlay={() => togglePlay(sample)}
                formatTime={formatTime}
              />
            );
          })}
        </Marquee>
      </div>
    </section>
  );
};

export default AudioSamples;
