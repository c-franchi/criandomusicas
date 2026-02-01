import { useTranslation } from "react-i18next";
import { Music, Sparkles, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { APP_VERSION } from "@/lib/version";
import { useState, useEffect } from "react";
import ContactFormModal from "./ContactFormModal";

const Footer = () => {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const [hasCelebration, setHasCelebration] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // Check if there's a celebration available
  useEffect(() => {
    const checkCelebration = () => {
      setHasCelebration(!!(window as any).__hasCelebration);
    };
    checkCelebration();
    // Re-check periodically in case Index.tsx loads after Footer
    const interval = setInterval(checkCelebration, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleOpenCelebration = () => {
    if ((window as any).__reopenCelebration) {
      (window as any).__reopenCelebration();
    }
  };

  return (
    <footer className="py-16 px-6 border-t border-border/30 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">Criando Músicas</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
              {t('footer.description')}
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold mb-6 text-foreground">{t('footer.product')}</h4>
            <ul className="space-y-4 text-muted-foreground">
              <li>
                <button 
                  onClick={() => scrollToSection('processo')} 
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('footer.howItWorks')}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('exemplos')} 
                  className="hover:text-primary transition-colors text-left"
                >
                  {t('footer.examples')}
                </button>
              </li>
              <li>
                <Link to="/planos" className="hover:text-primary transition-colors">
                  {t('footer.pricing')}
                </Link>
              </li>
              {/* Discreet celebration link - only show on homepage with active celebration */}
              {hasCelebration && window.location.pathname === '/' && (
                <li>
                  <button 
                    onClick={handleOpenCelebration}
                    className="hover:text-primary transition-colors text-left inline-flex items-center gap-1.5 text-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('footer.specialDates', 'Datas especiais')}
                  </button>
                </li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-foreground">{t('footer.legal')}</h4>
            <ul className="space-y-4 text-muted-foreground">
              <li>
                <Link to="/termos" className="hover:text-primary transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="hover:text-primary transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/regras" className="hover:text-primary transition-colors">
                  {t('footer.rules')}
                </Link>
              </li>
              <li>
                <button 
                  onClick={() => setContactOpen(true)}
                  className="hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {t('footer.contact')}
                </button>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/30 mt-12 pt-8 text-center">
          <p className="text-muted-foreground">{t('footer.copyright')}</p>
          <p className="text-xs mt-3 text-muted-foreground/60">v{APP_VERSION}</p>
          <p className="text-sm mt-3 text-muted-foreground">
            {t('footer.developedBy')}{" "}
            <a 
              href="https://neitechweb.web.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline transition-colors font-medium"
            >
              Neitch
            </a>
          </p>
        </div>
      </div>
      
      <ContactFormModal open={contactOpen} onOpenChange={setContactOpen} />
    </footer>
  );
};

export default Footer;
