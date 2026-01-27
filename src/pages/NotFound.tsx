import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const { t } = useTranslation('common');
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">{t('notFound.title')}</p>
        <Button asChild>
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            {t('notFound.backHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
