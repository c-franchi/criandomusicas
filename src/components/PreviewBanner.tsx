import { AlertTriangle, Info, Music } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface PreviewBannerProps {
  variant?: 'warning' | 'info' | 'compact';
  showDuration?: boolean;
  className?: string;
}

export function PreviewBanner({ 
  variant = 'warning', 
  showDuration = false, // No longer show duration since it's not time-based
  className 
}: PreviewBannerProps) {
  const { t } = useTranslation('briefing');

  if (variant === 'compact') {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1.5 px-2.5 py-1 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
          className
        )}
      >
        <Music className="w-3.5 h-3.5" />
        {t('preview.badge', 'Preview (Verso + Refrão)')}
      </Badge>
    );
  }

  if (variant === 'info') {
    return (
      <Alert className={cn(
        "bg-blue-500/10 border-blue-500/30",
        className
      )}>
        <Info className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-600 dark:text-blue-400 font-medium">
          {t('preview.playingLabel', 'Preview em reprodução')}
        </AlertTitle>
        <AlertDescription className="text-blue-600/80 dark:text-blue-400/80 text-sm">
          {t('preview.playingDescription', 'Você está ouvindo uma versão de teste para conhecer o estilo da música.')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={cn(
      "bg-amber-500/10 border-amber-500/30",
      className
    )}>
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
        {t('preview.freePreviewBadge', '🎁 Preview grátis')}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400">
          {t('preview.structureLimit', 'Verso + Refrão')}
        </Badge>
      </AlertTitle>
      <AlertDescription className="text-amber-600/80 dark:text-amber-400/80 text-sm mt-1 space-y-1">
        <p>{t('preview.warning', '⚠️ Atenção: Este é um PREVIEW DE TESTE limitado a verso e refrão, criado para demonstrar o estilo e a atmosfera da música.')}</p>
        <p className="font-medium">{t('preview.fullVersionNote', 'Para gerar a música completa, será necessário adquirir créditos.')}</p>
      </AlertDescription>
    </Alert>
  );
}

export default PreviewBanner;
