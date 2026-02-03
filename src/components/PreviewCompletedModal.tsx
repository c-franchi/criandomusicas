import { Music, Sparkles, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface PreviewCompletedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFull?: () => void;
}

export function PreviewCompletedModal({ 
  open, 
  onOpenChange,
  onCreateFull 
}: PreviewCompletedModalProps) {
  const { t } = useTranslation('briefing');

  const features = [
    { key: 'featureFullLyrics', default: 'Letra completa' },
    { key: 'featureMoreVerses', default: 'Mais versos e estrutura completa' },
    { key: 'featureProStructure', default: 'Estrutura profissional' },
    { key: 'featureFinalQuality', default: 'Qualidade final para uso real' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Music className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {t('preview.completedTitle', 'Gostou do que ouviu?')} 🎵
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('preview.completedDescription', 'Essa foi apenas uma previa curta.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              {t('preview.fullVersionFeatures', 'A versao completa pode ter:')}
            </p>
            <ul className="space-y-2">
              {features.map((feature) => (
                <li key={feature.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  {t(`preview.${feature.key}`, feature.default)}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onCreateFull?.();
              }}
              asChild={!onCreateFull}
            >
              {onCreateFull ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t('preview.createFullButton', 'Criar musica completa')}
                </>
              ) : (
                <Link to="/briefing?type=vocal">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t('preview.createFullButton', 'Criar musica completa')}
                </Link>
              )}
            </Button>

            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              asChild
            >
              <Link to="/planos">
                <CreditCard className="w-5 h-5 mr-2" />
                {t('preview.buyCreditsButton', 'Comprar creditos')}
              </Link>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {t('preview.freeStart', 'Gratis para comecar - Sem compromisso')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PreviewCompletedModal;
