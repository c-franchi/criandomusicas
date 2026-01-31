import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ImageCard } from "./ImageCard";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Option {
  id: string;
  label: string;
  imageSrc: string;
}

interface ImageCardGridProps {
  options: Option[];
  selectedId?: string;
  variant?: 'square' | 'circle';
  initialVisible?: number;
  onSelect: (id: string) => void;
  showMoreLabel?: string;
  showLessLabel?: string;
}

export const ImageCardGrid = ({
  options,
  selectedId,
  variant = 'square',
  initialVisible = 8,
  onSelect,
  showMoreLabel = "Ver mais",
  showLessLabel = "Ver menos",
}: ImageCardGridProps) => {
  const [showAll, setShowAll] = useState(false);
  const isMobile = useIsMobile();
  
  // On mobile, show fewer items initially
  const mobileInitialVisible = Math.min(initialVisible, 6);
  const effectiveInitialVisible = isMobile ? mobileInitialVisible : initialVisible;
  
  const visibleOptions = showAll ? options : options.slice(0, effectiveInitialVisible);
  const hasMore = options.length > effectiveInitialVisible;

  return (
    <div className="space-y-3">
      <motion.div
        className={cn(
          "grid gap-1.5 sm:gap-2",
          variant === 'circle'
            ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6"
            : "grid-cols-4 sm:grid-cols-4 md:grid-cols-5"
        )}
        layout
      >
        <AnimatePresence mode="popLayout">
          {visibleOptions.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.02, duration: 0.15 }}
              layout
            >
              <ImageCard
                id={option.id}
                label={option.label}
                imageSrc={option.imageSrc}
                selected={selectedId === option.id}
                variant={variant}
                onClick={() => onSelect(option.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {hasMore && (
        <motion.div 
          className="flex justify-center pt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs sm:text-sm text-muted-foreground hover:text-primary h-8"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {showLessLabel}
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {showMoreLabel} ({options.length - effectiveInitialVisible})
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default ImageCardGrid;
