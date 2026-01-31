import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar } from 'lucide-react';
import { UpcomingCelebration } from '@/hooks/useUpcomingCelebrations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CelebrationSuggestionProps {
  celebration: UpcomingCelebration;
  onAccept: () => void;
  onDismiss: () => void;
  open?: boolean;
}

export const CelebrationSuggestion = ({
  celebration,
  onAccept,
  onDismiss,
  open = true,
}: CelebrationSuggestionProps) => {
  const { t } = useTranslation('briefing');

  const getDaysLabel = (days: number) => {
    if (days === 0) return t('celebration.today', 'hoje!');
    if (days === 1) return t('celebration.tomorrow', 'amanhã!');
    return t('celebration.inDays', { count: days, defaultValue: `em ${days} dias` });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl animate-pulse">{celebration.emoji}</span>
            <div>
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <Calendar className="h-4 w-4" />
                {getDaysLabel(celebration.daysUntil)}
              </div>
              <DialogTitle className="text-xl">
                {celebration.localizedName} {t('celebration.isComing', 'está chegando!')}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            {t('celebration.question', 'Que tal criar uma música especial para essa data?')}{' '}
            {celebration.localizedDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            onClick={onAccept}
            variant="hero"
            className="gap-2 flex-1"
          >
            <Sparkles className="h-4 w-4" />
            {t('celebration.createFor', 'Criar música de')} {celebration.localizedName}
          </Button>
          
          <Button
            onClick={onDismiss}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            {t('celebration.noThanks', 'Não, obrigado')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CelebrationSuggestion;
