import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Menu, 
  Music, 
  Sparkles, 
  Star, 
  HelpCircle, 
  User, 
  LogOut, 
  Settings, 
  Zap, 
  Crown, 
  Play,
  FileText,
  Download,
  LayoutDashboard,
  Route
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useCredits } from "@/hooks/useCredits";
import { useCreatorSubscription } from "@/hooks/useCreatorSubscription";
import { useTour } from "@/hooks/useTour";
import ThemeToggle from "@/components/ThemeToggle";
import RegionSelector from "@/components/RegionSelector";

interface MobileMenuProps {
  showAnchors?: boolean;
}

const MobileMenu = ({ showAnchors = true }: MobileMenuProps) => {
  const { t: tCommon } = useTranslation('common');
  const { t: tHome } = useTranslation('home');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { hasCredits, totalAvailable, loading: creditsLoading } = useCredits();
  const { hasActiveSubscription, planDetails, loading: subscriptionLoading } = useCreatorSubscription();
  const { startTour } = useTour();

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName.slice(0, 2).toUpperCase();

  const scrollToSection = (sectionId: string) => {
    setIsOpen(false);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  const handleStartTour = () => {
    setIsOpen(false);
    setTimeout(() => {
      startTour();
    }, 300);
  };

  const isHomePage = location.pathname === '/';

  const sectionAnchors = [
    { id: 'processo', label: tHome('nav.process', 'Como Funciona'), icon: Sparkles },
    { id: 'exemplos', label: tHome('nav.examples', 'Exemplos'), icon: Play },
    { id: 'planos', label: tHome('nav.pricing', 'Planos'), icon: Crown },
    { id: 'depoimentos', label: tHome('nav.testimonials', 'Depoimentos'), icon: Star },
    { id: 'faq', label: tHome('nav.faq', 'Dúvidas'), icon: HelpCircle },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden relative w-10 h-10 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-[300px] sm:w-[350px] p-0 bg-background/95 backdrop-blur-xl border-l border-border/50"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <Music className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold">Criando Músicas</span>
              </SheetTitle>
            </div>
            
            {/* User Info (if logged in) */}
            {user && (
              <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-muted/50">
                <Avatar className="w-10 h-10 border-2 border-primary/50">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}
            
            {/* Badges */}
            {user && (
              <div className="flex flex-wrap gap-2 mt-3">
                {!subscriptionLoading && hasActiveSubscription && planDetails && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground border-0 gap-1">
                    <Crown className="w-3 h-3" />
                    {planDetails.name.replace('Creator ', '')}
                  </Badge>
                )}
                {!creditsLoading && hasCredits && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-primary-foreground border-0 gap-1">
                    <Zap className="w-3 h-3" />
                    {totalAvailable} {totalAvailable !== 1 ? 'créditos' : 'crédito'}
                  </Badge>
                )}
              </div>
            )}
          </SheetHeader>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Quick Actions (logged in) */}
            {user && (
              <div className="p-4 space-y-2">
                <Button 
                  variant="default" 
                  className="w-full justify-start gap-3 h-12 rounded-xl"
                  onClick={() => handleNavigation('/dashboard')}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  {tCommon('nav.dashboard', 'Meus Pedidos')}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-12 rounded-xl bg-accent/10 border-accent/30 hover:bg-accent/20"
                  onClick={() => handleNavigation('/briefing?type=vocal')}
                >
                  <Zap className="w-5 h-5 text-accent" />
                  <span className="text-accent">Criar Rápido</span>
                </Button>
              </div>
            )}
            
            {/* Section Anchors */}
            {showAnchors && (
              <>
                <Separator className="mx-4" />
                <div className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">
                    Navegar
                  </p>
                  <nav className="space-y-1">
                    {sectionAnchors.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </>
            )}
            
            {/* Navigation Links */}
            <Separator className="mx-4" />
            <div className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Menu
              </p>
              <nav className="space-y-1">
                {user ? (
                  <>
                    <button
                      onClick={() => handleNavigation('/perfil')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      {tCommon('nav.profile', 'Meu Perfil')}
                    </button>
                    <button
                      onClick={() => handleNavigation('/install')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Download className="w-4 h-4 text-muted-foreground" />
                      {tCommon('navigation.install', 'Instalar App')}
                    </button>
                    {isHomePage && (
                      <button
                        onClick={handleStartTour}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Route className="w-4 h-4 text-muted-foreground" />
                        {tCommon('tour.startTour', 'Ver Tour')}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleNavigation('/admin')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        {tCommon('navigation.admin', 'Admin')}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleNavigation('/auth')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    {tCommon('auth.login', 'Entrar')}
                  </button>
                )}
              </nav>
            </div>
            
            {/* Legal Links */}
            <Separator className="mx-4" />
            <div className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Legal
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNavigation('/termos')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Termos de Uso
                </button>
                <button
                  onClick={() => handleNavigation('/privacidade')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Política de Privacidade
                </button>
              </nav>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-border/30 space-y-4">
            {/* Settings Row */}
            <div className="flex items-center justify-between gap-2">
              <RegionSelector variant="compact" />
              <ThemeToggle />
            </div>
            
            {/* Sign Out */}
            {user && (
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                {tCommon('auth.logout', 'Sair')}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
