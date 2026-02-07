import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, Music } from "lucide-react";

const AudioModeLoadingOverlay = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Analisando sua história...");

  useEffect(() => {
    const statuses = [
      "Analisando sua história...",
      "Criando estrofes e refrões...",
      "Refinando a letra...",
      "Quase pronto...",
    ];

    let currentIdx = 0;

    const statusInterval = setInterval(() => {
      currentIdx = (currentIdx + 1) % statuses.length;
      setStatusText(statuses[currentIdx]);
    }, 12000);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1.5, 95));
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center px-6 max-w-md w-full">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Music className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <Loader2 className="w-6 h-6 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Gerando sua letra...</h2>
          <p className="text-sm text-muted-foreground">
            A IA está compondo duas opções de letra para você escolher
          </p>
        </div>
        <div className="w-full space-y-3">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground animate-pulse">{statusText}</p>
          <p className="text-xs text-muted-foreground/70">
            ⏱️ Esse processo pode levar até 2 minutos
          </p>
        </div>
      </div>
    </div>
  );
};

export default AudioModeLoadingOverlay;
