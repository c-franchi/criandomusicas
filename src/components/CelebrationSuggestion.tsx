import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, Sparkles, Calendar } from 'lucide-react';
import { UpcomingCelebration } from '@/hooks/useUpcomingCelebrations';

interface CelebrationSuggestionProps {
  celebration: UpcomingCelebration;
  onAccept: () => void;
  onDismiss: () => void;
}

export const CelebrationSuggestion = ({
  celebration,
  onAccept,
  onDismiss,
}: CelebrationSuggestionProps) => {
  const { t } = useTranslation('briefing');

  const getDaysLabel = (days: number) => {
    if (days === 0) return t('celebration.today', 'hoje!');
    if (days === 1) return t('celebration.tomorrow', 'amanhã!');
    return t('celebration.inDays', { count: days, defaultValue: `em ${days} dias` });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-6 mb-6"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-background/50 hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
          aria-label={t('celebration.dismiss', 'Fechar')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10">
          {/* Header with emoji and date indicator */}
          <div className="flex items-start gap-4 mb-4">
            <motion.span 
              className="text-4xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {celebration.emoji}
            </motion.span>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {getDaysLabel(celebration.daysUntil)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground">
                {celebration.localizedName} {t('celebration.isComing', 'está chegando!')}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground mb-5 leading-relaxed">
            {t('celebration.question', 'Que tal criar uma música especial para essa data?')}{' '}
            {celebration.localizedDescription}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onAccept}
              variant="hero"
              className="gap-2"
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CelebrationSuggestion;
