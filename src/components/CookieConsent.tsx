import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Cookie, Shield, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_STORAGE_KEY = 'criandomusicas_consent';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  accepted_at: string;
}

const CookieConsent = () => {
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
                Sua Privacidade é Importante
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Utilizamos cookies para melhorar sua experiência em nosso site. 
                De acordo com a LGPD (Lei Geral de Proteção de Dados), precisamos do seu consentimento.
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
                    Cookies Essenciais (Obrigatórios)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Necessários para o funcionamento do site, autenticação e segurança.
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
                    Cookies de Análise
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Nos ajudam a entender como você usa o site para melhorar a experiência.
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
                    Cookies de Marketing
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permitem mostrar anúncios relevantes em outros sites.
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
              Política de Privacidade
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link 
              to="/termos" 
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Termos de Uso
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
                  Voltar
                </Button>
                <Button 
                  onClick={handleSavePreferences}
                  className="flex-1"
                >
                  Salvar Preferências
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleAcceptEssential}
                  className="flex-1 sm:flex-none"
                >
                  Apenas Essenciais
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDetails(true)}
                  className="flex-1 sm:flex-none"
                >
                  Personalizar
                </Button>
                <Button 
                  onClick={handleAcceptAll}
                  className="flex-1"
                >
                  Aceitar Todos
                </Button>
              </>
            )}
          </div>

          {/* LGPD Notice */}
          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
            Ao continuar navegando, você concorda com nossa política de privacidade conforme a Lei 13.709/2018 (LGPD).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsent;
