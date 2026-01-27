import { Music, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PlanTypeToggleProps {
  isInstrumental: boolean;
  onToggle: (isInstrumental: boolean) => void;
  className?: string;
}

const PlanTypeToggle = ({ isInstrumental, onToggle, className }: PlanTypeToggleProps) => {
  const { t } = useTranslation('pricing');
  
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="relative flex items-center p-1 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm">
        {/* Background slider */}
        <div
          className={cn(
            "absolute h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out",
            isInstrumental ? "left-[calc(50%+2px)]" : "left-1"
          )}
        />
        
        {/* Vocal option */}
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={cn(
            "relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200",
            !isInstrumental 
              ? "text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Mic2 className="w-4 h-4" />
          <span>{t('toggle.vocal')}</span>
        </button>
        
        {/* Instrumental option */}
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={cn(
            "relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200",
            isInstrumental 
              ? "text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Music className="w-4 h-4" />
          <span>{t('toggle.instrumental')}</span>
        </button>
      </div>
    </div>
  );
};

export default PlanTypeToggle;
