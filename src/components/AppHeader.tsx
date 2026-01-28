import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Zap, Crown, Home, Settings, Download, Music } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useCredits } from "@/hooks/useCredits";
import { useCreatorSubscription } from "@/hooks/useCreatorSubscription";
import ThemeToggle from "@/components/ThemeToggle";
import RegionSelector from "@/components/RegionSelector";

interface AppHeaderProps {
  variant?: "floating" | "sticky" | "simple";
  showLogo?: boolean;
  showHomeButton?: boolean;
  showCredits?: boolean;
  showUserMenu?: boolean;
  className?: string;
}

const AppHeader = ({
  variant = "floating",
  showLogo = false,
  showHomeButton = false,
  showCredits = true,
  showUserMenu = true,
  className = "",
}: AppHeaderProps) => {
  const { t: tCommon } = useTranslation('common');
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { hasCredits, totalAvailable, loading: creditsLoading } = useCredits();
  const { hasActiveSubscription, planDetails, loading: subscriptionLoading } = useCreatorSubscription();

  // Get display name - prefer profile name, fallback to email
  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName.slice(0, 2).toUpperCase();

  const containerClasses = {
    floating: "absolute top-6 right-6 z-20",
    sticky: "sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3",
    simple: "flex items-center justify-end gap-3 py-3",
  };

  return (
    <header className={`${containerClasses[variant]} ${className}`}>
      <div className="flex items-center gap-3">
        {/* Logo */}
        {showLogo && (
          <Link to="/" className="flex items-center gap-2 mr-4 group">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground hidden sm:inline">Criando Músicas</span>
          </Link>
        )}

        {/* Home Button */}
        {showHomeButton && (
          <Button variant="outline" size="icon" asChild className="hover:scale-105 transition-transform rounded-xl">
            <Link to="/" title={tCommon('navigation.home', 'Home')}>
              <Home className="w-4 h-4" />
            </Link>
          </Button>
        )}

        {/* Region Selector (includes language & currency) */}
        <RegionSelector variant="compact" />
        
        {/* Theme Toggle */}
        <ThemeToggle />

        {user && showUserMenu ? (
          <>
            {/* Creator Subscription Badge */}
            {!subscriptionLoading && hasActiveSubscription && planDetails && (
              <Link to="/perfil?tab=subscription">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1.5 cursor-pointer hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg">
                  <Crown className="w-3 h-3" />
                  {planDetails.name.replace('Creator ', '')}
                </Badge>
              </Link>
            )}
            
            {/* Credits Badge - Show if user has credits */}
            {showCredits && !creditsLoading && hasCredits && (
              <Link to="/perfil?tab=credits">
                <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 gap-1.5 cursor-pointer hover:from-emerald-400 hover:to-green-400 transition-all shadow-lg">
                  <Zap className="w-3 h-3" />
                  {totalAvailable} {totalAvailable !== 1 ? tCommon('credits.credits') : tCommon('credits.credit')}
                </Badge>
              </Link>
            )}
            
            {/* User Profile */}
            <Link to="/perfil" className="flex items-center gap-2 glass-card rounded-full pl-1 pr-3 py-1 hover:border-primary/40 transition-all">
              <Avatar className="w-8 h-8 border-2 border-primary/50 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground max-w-[150px] truncate hidden sm:inline">
                {displayName}
              </span>
            </Link>
            
            {/* Install Button */}
            <Button variant="outline" size="icon" asChild className="hover:scale-105 transition-transform hidden sm:flex rounded-xl">
              <Link to="/install" title={tCommon('navigation.install', 'Install')}>
                <Download className="w-4 h-4" />
              </Link>
            </Button>
            
            {/* Admin Settings */}
            {isAdmin && (
              <Button variant="outline" size="icon" asChild className="hover:scale-105 transition-transform rounded-xl">
                <Link to="/admin" title={tCommon('navigation.admin', 'Admin')}>
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
            )}
            
            {/* Logout Button */}
            <Button variant="outline" size="sm" onClick={() => signOut()} className="rounded-xl">
              {tCommon('auth.logout')}
            </Button>
          </>
        ) : !user ? (
          <Link to="/auth">
            <Button variant="outline" size="sm" className="rounded-xl">
              <User className="w-4 h-4 mr-2" />
              {tCommon('auth.login')}
            </Button>
          </Link>
        ) : null}
      </div>
    </header>
  );
};

export default AppHeader;
