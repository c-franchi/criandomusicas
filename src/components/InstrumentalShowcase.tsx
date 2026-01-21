import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Music, Piano, Guitar } from "lucide-react";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";

interface InstrumentalSample {
  id: string;
  title: string;
  description: string;
  instruments: string[];
  style: string;
  mood: string;
  audioUrl?: string;
  coverUrl: string;
}

const instrumentalSamples: InstrumentalSample[] = [
  {
    id: "inst-1",
    title: "Serenata ao Luar",
    description: "Piano solo melancólico com toques de jazz, perfeito para momentos de reflexão",
    instruments: ["Piano", "Cordas"],
    style: "Jazz",
    mood: "Melancólico",
    coverUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop"
  },
  {
    id: "inst-2",
    title: "Alma Brasileira",
    description: "Violão clássico com influências de bossa nova e MPB contemporânea",
    instruments: ["Violão", "Percussão"],
    style: "MPB",
    mood: "Romântico",
    coverUrl: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=300&fit=crop"
  },
  {
    id: "inst-3",
    title: "Horizonte Infinito",
    description: "Orquestra épica com solo de violino, ideal para vídeos e apresentações",
    instruments: ["Orquestra", "Violino Solo"],
    style: "Clássico",
    mood: "Épico",
    coverUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop"
  },
  {
    id: "inst-4",
    title: "Groove Noturno",
    description: "Saxofone suave com piano jazz, atmosfera de clube noturno",
    instruments: ["Saxofone", "Piano", "Contrabaixo"],
    style: "Jazz",
    mood: "Sofisticado",
    coverUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop"
  },
  {
    id: "inst-5",
    title: "Despertar Rural",
    description: "Viola caipira com acordeão, trilha perfeita para memórias do campo",
    instruments: ["Viola", "Acordeão", "Violão"],
    style: "Sertanejo",
    mood: "Nostálgico",
    coverUrl: "https://images.unsplash.com/photo-1516981879613-9f5da904015f?w=400&h=300&fit=crop"
  }
];

const InstrumentalShowcase = () => {
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const getInstrumentIcon = (instrument: string) => {
    const lower = instrument.toLowerCase();
    if (lower.includes("piano") || lower.includes("teclado")) return <Piano className="w-3 h-3" />;
    if (lower.includes("violão") || lower.includes("guitarra")) return <Guitar className="w-3 h-3" />;
    return <Music className="w-3 h-3" />;
  };

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-secondary/20 to-background" id="instrumentais">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
            <Piano className="w-3 h-3 mr-1" />
            100% Instrumental
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            Músicas{" "}
            <span className="gradient-text">sem vocal</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Trilhas instrumentais personalizadas para vídeos, apresentações, meditação e momentos especiais
          </p>
        </div>
        
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {instrumentalSamples.map((sample) => {
              const isPlaying = currentPlaying === sample.id;
              const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
              
              return (
                <CarouselItem key={sample.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <Card 
                    className={`overflow-hidden border-border/50 transition-all duration-500 group ${
                      isPlaying 
                        ? 'ring-2 ring-accent shadow-lg shadow-accent/20 scale-[1.02]' 
                        : 'hover:border-accent/50 hover:shadow-md'
                    }`}
                  >
                    <div className="relative h-48">
                      <img 
                        src={sample.coverUrl}
                        alt={`Música instrumental ${sample.style}: ${sample.title} - ${sample.description}`}
                        className={`w-full h-full object-cover transition-all duration-500 ${
                          isPlaying ? 'scale-110 brightness-75' : 'group-hover:scale-105'
                        }`}
                        loading="lazy"
                      />
                      <div className={`absolute inset-0 transition-all duration-500 ${
                        isPlaying 
                          ? 'bg-gradient-to-t from-accent/90 via-accent/40 to-transparent' 
                          : 'bg-gradient-to-t from-black/80 via-black/40 to-transparent'
                      }`} />
                      
                      {/* Animated equalizer when playing */}
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
                        {isPlaying ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6 ml-0.5" />
                        )}
                      </Button>
                      
                      <Badge className="absolute top-3 left-3 bg-accent/90">
                        🎹 {sample.style}
                      </Badge>
                    </div>
                    
                    <div className="p-5">
                      <h3 className="text-lg font-semibold mb-2">{sample.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {sample.description}
                      </p>
                      
                      {/* Instruments tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {sample.instruments.map((instrument, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
                            {getInstrumentIcon(instrument)}
                            {instrument}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {sample.mood}
                        </Badge>
                        
                        {isPlaying && duration > 0 && (
                          <span className="text-xs text-accent font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        )}
                      </div>
                      
                      {/* Progress bar when playing */}
                      {isPlaying && (
                        <div className="mt-3">
                          <Progress 
                            value={progress} 
                            className="h-1.5 bg-muted [&>div]:bg-accent"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          
          <CarouselPrevious className="-left-4 md:-left-12 bg-background/80 backdrop-blur-sm border-accent/20 hover:bg-accent hover:text-white" />
          <CarouselNext className="-right-4 md:-right-12 bg-background/80 backdrop-blur-sm border-accent/20 hover:bg-accent hover:text-white" />
        </Carousel>
        
        {/* Mobile swipe indicator */}
        <div className="flex justify-center gap-2 mt-6 md:hidden">
          <p className="text-sm text-muted-foreground">
            ← Deslize para ver mais →
          </p>
        </div>
        
        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            💰 Músicas instrumentais com <span className="text-accent font-semibold">20% de desconto</span>
          </p>
          <Button 
            variant="outline" 
            className="border-accent/50 hover:bg-accent hover:text-white"
            onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Music className="w-4 h-4 mr-2" />
            Ver Planos Instrumentais
          </Button>
        </div>
      </div>
    </section>
  );
};

export default InstrumentalShowcase;
