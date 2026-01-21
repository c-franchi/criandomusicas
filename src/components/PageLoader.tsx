import { Music } from "lucide-react";

const PageLoader = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Music className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    </div>
  );
};

export default PageLoader;
