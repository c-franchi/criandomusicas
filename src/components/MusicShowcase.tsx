import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Heart, Clock } from "lucide-react";

const MusicShowcase = () => {
  const songs = [
    {
      id: 1,
      title: "Amor de Pai",
      occasion: "Aniversário",
      style: "Sertanejo",
      duration: "3:45",
      likes: 124,
      description: "Uma homenagem emocionante de pai para filha no seus 15 anos",
      coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop"
    },
    {
      id: 2,
      title: "Nossa Jornada",
      occasion: "Casamento",
      style: "Pop Romântico",
      duration: "4:12",
      likes: 89,
      description: "A história de amor do casal desde o primeiro encontro",
      coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&h=300&fit=crop"
    },
    {
      id: 3,
      title: "Força da Fé",
      occasion: "Igreja",
      style: "Worship",
      duration: "5:23",
      likes: 156,
      description: "Louvor personalizado para a igreja celebrar vitórias",
      coverUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"
    }
  ];

  return (
    <section className="py-24 px-6 bg-secondary/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Músicas que{" "}
            <span className="gradient-text">emocionam</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ouça alguns exemplos de músicas criadas para nossos clientes
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {songs.map((song) => (
            <Card key={song.id} className="overflow-hidden glass-card border-border/50 hover:border-primary/50 transition-all duration-300 group">
              <div className="relative">
                <img 
                  src={song.coverUrl} 
                  alt={song.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button variant="glass" size="icon" className="w-16 h-16 rounded-full">
                    <Play className="w-6 h-6 ml-1" />
                  </Button>
                </div>
                <Badge className="absolute top-3 left-3 bg-primary">
                  {song.style}
                </Badge>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{song.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{song.description}</p>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {song.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {song.likes}
                    </span>
                  </div>
                  <Badge variant="outline">{song.occasion}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button variant="hero" size="lg">
            Criar Minha Música Agora
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MusicShowcase;