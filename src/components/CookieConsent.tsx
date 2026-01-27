import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Cookie, Shield, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const CONSENT_STORAGE_KEY = 'criandomusicas_consent';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  accepted_at: string;
}

const CookieConsent = () => {
  const { t } = useTranslation('legal');
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    essential: true,
    analytics: false,
    marketing: false,
    accepted_at: ''
  });

  useEffect(() => {
    // Check if consent already given
    const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!storedConsent) {
      setShowBanner(true);
    }
  }, []);

  const saveConsent = async (accepted: boolean, customConsent?: Partial<ConsentState>) => {
    const finalConsent: ConsentState = {
      essential: true,
      analytics: accepted || customConsent?.analytics || false,
      marketing: accepted || customConsent?.marketing || false,
      accepted_at: new Date().toISOString()
    };

    // Save to localStorage
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(finalConsent));

    // Save to database if user is logged in
    if (user?.id) {
      try {
        // Check if consent exists first
        const { data: existingConsent } = await supabase
          .from('consents')
          .select('id')
          .eq('user_id', user.id)
          .eq('consent_type', 'LGPD')
          .maybeSingle();

        if (existingConsent) {
          await supabase.from('consents')
            .update({
              granted: accepted,
              granted_at: new Date().toISOString()
            })
            .eq('id', existingConsent.id);
        } else {
          await supabase.from('consents').insert({
            user_id: user.id,
            consent_type: 'LGPD',
            granted: accepted,
            granted_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error saving consent to DB:', error);
      }
    }

    setShowBanner(false);
  };

  const handleAcceptAll = () => {
    saveConsent(true);
  };

  const handleAcceptEssential = () => {
    saveConsent(false);
  };

  const handleSavePreferences = () => {
    saveConsent(false, consent);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-2xl border-primary/20 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Cookie className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {t('cookies.title')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('cookies.description')}
              </p>
            </div>
          </div>

          {/* Cookie Details (collapsible) */}
          {showDetails && (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="essential" 
                  checked={consent.essential} 
                  disabled 
                />
                <div className="flex-1">
                  <Label htmlFor="essential" className="font-medium">
                    {t('cookies.essential.title')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('cookies.essential.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="analytics" 
                  checked={consent.analytics}
                  onCheckedChange={(checked) => 
                    setConsent(prev => ({ ...prev, analytics: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="analytics" className="font-medium cursor-pointer">
                    {t('cookies.analytics.title')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('cookies.analytics.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="marketing" 
                  checked={consent.marketing}
                  onCheckedChange={(checked) => 
                    setConsent(prev => ({ ...prev, marketing: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="marketing" className="font-medium cursor-pointer">
                    {t('cookies.marketing.title')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('cookies.marketing.description')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-4 text-sm">
            <Link 
              to="/privacidade" 
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {t('cookies.privacyLink')}
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link 
              to="/termos" 
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {t('cookies.termsLink')}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {showDetails ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetails(false)}
                  className="flex-1"
                >
                  {t('cookies.back')}
                </Button>
                <Button 
                  onClick={handleSavePreferences}
                  className="flex-1"
                >
                  {t('cookies.savePreferences')}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleAcceptEssential}
                  className="flex-1 sm:flex-none"
                >
                  {t('cookies.essentialOnly')}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDetails(true)}
                  className="flex-1 sm:flex-none"
                >
                  {t('cookies.customize')}
                </Button>
                <Button 
                  onClick={handleAcceptAll}
                  className="flex-1"
                >
                  {t('cookies.acceptAll')}
                </Button>
              </>
            )}
          </div>

          {/* LGPD Notice */}
          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
            {t('cookies.lgpdNotice')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsent;
