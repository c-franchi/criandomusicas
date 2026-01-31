import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Music, Download, Smartphone, Bell, Check, ArrowLeft, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationToggle } from '@/components/PushNotificationPrompt';
import { useAuth } from '@/hooks/useAuth';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">{t('install.title')}</h1>
                  <p className="text-xs text-muted-foreground">Criando Músicas</p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Music className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Criando Músicas</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('install.subtitle')}
          </p>
        </div>

        {/* Install Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {isInstalled ? (
                <Check className="w-6 h-6 text-green-500" />
              ) : (
                <Download className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">
                {isInstalled ? t('install.installed') : t('install.addToHome')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isInstalled 
                  ? t('install.installedDesc') 
                  : t('install.addToHomeDesc')}
              </p>
            </div>
          </div>

          {!isInstalled && (
            <>
              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  {t('install.installNow')}
                </Button>
              ) : isIOS ? (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">{t('install.ios.title')}</p>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">1.</span>
                      {t('install.ios.step1')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">2.</span>
                      {t('install.ios.step2')}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">3.</span>
                      {t('install.ios.step3')}
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    {t('install.browserHint')}
                  </p>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Notifications Card */}
        {user && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{t('install.notifications.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('install.notifications.description')}
                </p>
              </div>
            </div>
            <NotificationToggle />
          </Card>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <Smartphone className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h4 className="font-medium text-sm">{t('install.features.quickAccess')}</h4>
            <p className="text-xs text-muted-foreground">{t('install.features.quickAccessDesc')}</p>
          </Card>
          <Card className="p-4 text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h4 className="font-medium text-sm">{t('install.features.notifications')}</h4>
            <p className="text-xs text-muted-foreground">{t('install.features.notificationsDesc')}</p>
          </Card>
          <Card className="p-4 text-center">
            <Download className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h4 className="font-medium text-sm">{t('install.features.offline')}</h4>
            <p className="text-xs text-muted-foreground">{t('install.features.offlineDesc')}</p>
          </Card>
        </div>

        {/* Back Button */}
        <div className="text-center pt-4">
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backHome')}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Install;
