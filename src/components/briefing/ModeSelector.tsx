import { motion } from "framer-motion";
import { Zap, Palette, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ModeSelectorProps {
  onSelectMode: (mode: 'quick' | 'detailed') => void;
}

export const ModeSelector = ({ onSelectMode }: ModeSelectorProps) => {
  const { t } = useTranslation('briefing');

  const modes = [
    {
      id: 'quick' as const,
      icon: Zap,
      title: t('modeSelector.quickTitle'),
      description: t('modeSelector.quickDescription'),
      features: [
        t('modeSelector.quickFeature1'),
        t('modeSelector.quickFeature2'),
        t('modeSelector.quickFeature3'),
      ],
      gradient: 'from-amber-500 to-orange-500',
      recommended: true,
    },
    {
      id: 'detailed' as const,
      icon: Palette,
      title: t('modeSelector.detailedTitle'),
      description: t('modeSelector.detailedDescription'),
      features: [
        t('modeSelector.detailedFeature1'),
        t('modeSelector.detailedFeature2'),
        t('modeSelector.detailedFeature3'),
      ],
      gradient: 'from-primary to-accent',
      recommended: false,
    },
  ];

  return (
    <div className="space-y-4 py-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t('modeSelector.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('modeSelector.subtitle')}
        </p>
      </div>

      <div className="space-y-3">
        {modes.map((mode, index) => (
          <motion.button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={cn(
              "w-full p-4 rounded-xl border text-left transition-all duration-300",
              "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
              "bg-card/50 backdrop-blur-sm",
              mode.recommended 
                ? "border-primary/50 ring-2 ring-primary/20" 
                : "border-border/50 hover:border-primary/30"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-xl bg-gradient-to-br",
                mode.gradient
              )}>
                <mode.icon className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">
                    {mode.title}
                  </h3>
                  {mode.recommended && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
                      {t('modeSelector.recommended')}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {mode.description}
                </p>
                
                <ul className="space-y-1">
                  {mode.features.map((feature, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="text-primary">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
