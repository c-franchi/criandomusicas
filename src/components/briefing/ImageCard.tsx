import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  id: string;
  label: string;
  imageSrc: string;
  selected?: boolean;
  variant?: 'square' | 'circle';
  priority?: boolean;
  onClick: () => void;
}

// Remove emojis from text
const stripEmojis = (text: string) => {
  return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '').trim();
};

export const ImageCard = memo(({
  id,
  label,
  imageSrc,
  selected = false,
  variant = 'square',
  priority = false,
  onClick,
}: ImageCardProps) => {
  const isCircle = variant === 'circle';
  const cleanLabel = stripEmojis(label);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "relative group flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
      whileTap={{ scale: 0.95 }}
    >
      {/* Image container */}
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          isCircle 
            ? "w-16 h-16 sm:w-20 sm:h-20 rounded-full" 
            : "w-20 h-20 sm:w-24 sm:h-24 rounded-xl",
          "bg-muted/50",
          selected 
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/30" 
            : "ring-1 ring-border/30"
        )}
      >
        <img
          src={imageSrc}
          alt={cleanLabel}
          className={cn(
            "w-full h-full object-cover transition-all duration-200",
            selected ? "brightness-100" : "brightness-75"
          )}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
        />
        
        {/* Label overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-1 py-1.5">
          <span className="text-[10px] sm:text-xs font-medium text-white text-center block truncate">
            {cleanLabel}
          </span>
        </div>
      </div>
    </motion.button>
  );
});

ImageCard.displayName = 'ImageCard';

export default ImageCard;
