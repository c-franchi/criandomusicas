import sampleCover from "@/assets/briefing/genres/pop.jpg";
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
          src={sample.cover_url || sampleCover}
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
            <div className="w-1 bg-primary-foreground rounded-full animate-pulse" style={{ height: '12px', animationDelay: '0ms' }} />
            <div className="w-1 bg-primary-foreground rounded-full animate-pulse" style={{ height: '18px', animationDelay: '150ms' }} />
            <div className="w-1 bg-primary-foreground rounded-full animate-pulse" style={{ height: '10px', animationDelay: '300ms' }} />
            <div className="w-1 bg-primary-foreground rounded-full animate-pulse" style={{ height: '16px', animationDelay: '450ms' }} />
          </div>
        )}
        
        {sample.audio_url && (
          <Button 
            variant="ghost" 
            size="icon" 
            className={`absolute bottom-4 right-4 w-14 h-14 rounded-full transition-all duration-300 shadow-xl ${
              isPlaying 
                ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90 scale-110' 
                : 'bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground'
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
        
        <Badge className="absolute top-3 left-3 bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 shadow-lg">
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

const AudioSamples = ({ audioType = "vocal" }: { audioType?: "vocal" | "instrumental" }) => {
  const { t } = useTranslation('home');
  const [samples, setSamples] = useState<AudioSample[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_samples')
          .select('id, title, description, style, occasion, audio_url, cover_url, audio_type')
          .eq('is_active', true)
          .eq('audio_type', audioType)
          .order('sort_order', { ascending: true })
          .limit(12);

        if (error || !data || data.length === 0) {
          setSamples([]);
        } else {
          setSamples((data as AudioSample[]).filter(sample => !!sample.audio_url));
        }
      } catch {
        setSamples([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSamples();

    return () => {
      audioRef.current?.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [audioType]);

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
      
      audioRef.current = audio;
      void audio.play().catch(() => setCurrentPlaying(null));
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

  if (!loading && samples.length === 0) return null;

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
