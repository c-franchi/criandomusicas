import { useTranslation } from "react-i18next";
import splashLogo from "@/assets/splash-logo.png";

const PageLoader = () => {
  const { t } = useTranslation('common');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img src={splashLogo} alt="Criando Músicas" className="w-64 h-auto animate-pulse" />
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </div>
    </div>
  );
};

export default PageLoader;
