import { Music } from "lucide-react";
import { useTranslation } from "react-i18next";

const PageLoader = () => {
  const { t } = useTranslation('common');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Music className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </div>
    </div>
  );
};

export default PageLoader;
