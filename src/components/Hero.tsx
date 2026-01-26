import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Music, Sparkles, Headphones, User, ArrowRight, LayoutDashboard, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useCredits } from "@/hooks/useCredits";
import heroImage from "@/assets/hero-music.jpg";

const Hero = () => {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { hasCredits, totalAvailable, loading: creditsLoading } = useCredits();

  // Get display name - prefer profile name, fallback to email
  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20" 
        style={{ backgroundImage: `url(${heroImage})` }}
        role="img"
        aria-label="Músico criando música personalizada em estúdio profissional - Criando Músicas"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background/80 to-accent/30" />
      
      {/* Auth Section */}
      <div className="absolute top-6 right-6 z-20">
        {user ? (
          <div className="flex items-center gap-3">
            {/* Credits Badge - Show if user has credits */}
            {!creditsLoading && hasCredits && (
              <Link to="/perfil?tab=credits">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1.5 cursor-pointer hover:bg-green-500/30 transition-colors">
                  <Zap className="w-3 h-3" />
                  {totalAvailable} crédito{totalAvailable !== 1 ? 's' : ''}
                </Badge>
              </Link>
            )}
            <Link to="/perfil" className="flex items-center gap-2 bg-secondary/80 backdrop-blur-sm rounded-full pl-1 pr-3 py-1 hover:bg-secondary transition-colors">
              <Avatar className="w-8 h-8 border-2 border-primary/50">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground max-w-[150px] truncate">
                {displayName}
              </span>
            </Link>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sair
            </Button>
          </div>
        ) : (
          <Link to="/auth">
            <Button variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Entrar
            </Button>
          </Link>
        )}
      </div>
      
      {/* Floating Elements - decorative, hidden from screen readers */}
      <div className="absolute top-20 left-10 animate-float" aria-hidden="true">
        <Music className="w-12 h-12 text-primary/60" />
      </div>
      <div className="absolute bottom-32 right-16 animate-float" style={{ animationDelay: '2s' }} aria-hidden="true">
        <Sparkles className="w-8 h-8 text-accent/60" />
      </div>
      <div className="absolute top-1/2 left-20 animate-float" style={{ animationDelay: '4s' }} aria-hidden="true">
        <Headphones className="w-10 h-10 text-primary/40" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight px-0 my-[67px]">
          Conte sua{" "}
          <span className="gradient-text">história.</span>
          <br />
          A gente transforma em{" "}
          <span className="gradient-text">música.</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Crie músicas personalizadas para homenagear, presentear ou eternizar momentos 
          — com opção de vídeo pronto para compartilhar.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="hero" size="lg" className="text-lg px-8 py-6 group">
                    <LayoutDashboard className="w-5 h-5 mr-2" />
                    Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
              <Link to="/dashboard">
                <Button variant={isAdmin ? "outline" : "hero"} size="lg" className="text-lg px-8 py-6 group">
                  Meus Pedidos
                  {!isAdmin && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </Link>
              <Link to="/briefing">
                <Button 
                  variant={hasCredits ? "hero" : "outline"} 
                  size="lg" 
                  className={`text-lg px-8 py-6 group ${hasCredits ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400' : ''}`}
                >
                  {hasCredits ? (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Usar Crédito
                    </>
                  ) : (
                    'Nova Música'
                  )}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/briefing">
                <Button variant="hero" size="lg" className="text-lg px-8 py-6 group">
                  Criar Minha Música
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                variant="glass" 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => document.getElementById('exemplos')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver exemplos 🎧
              </Button>
            </>
          )}
        </div>
        
        {/* Micro Social Proof */}
        <div className="mt-6 text-muted-foreground text-sm md:text-base">
          <span className="text-accent">⭐⭐⭐⭐⭐</span>{" "}
          Mais de 500 músicas criadas • Entrega rápida • Avaliações reais
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-12 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">500+</div>
            <div className="text-muted-foreground">Músicas Criadas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">48h</div>
            <div className="text-muted-foreground">Tempo Médio</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">5.0★</div>
            <div className="text-muted-foreground">Avaliação</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
