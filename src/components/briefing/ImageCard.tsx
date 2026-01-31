import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  id: string;
  label: string;
  imageSrc: string;
  selected?: boolean;
  variant?: 'square' | 'circle';
  onClick: () => void;
}

export const ImageCard = ({
  id,
  label,
  imageSrc,
  selected = false,
  variant = 'square',
  onClick,
}: ImageCardProps) => {
  const isCircle = variant === 'circle';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "relative group flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all duration-300",
        "hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
      whileTap={{ scale: 0.95 }}
    >
      {/* Image container */}
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          isCircle 
            ? "w-16 h-16 sm:w-20 sm:h-20 rounded-full" 
            : "w-20 h-20 sm:w-24 sm:h-24 rounded-xl",
          "bg-muted/50",
          selected 
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/30" 
            : "ring-1 ring-border/30 group-hover:ring-primary/50"
        )}
      >
        <img
          src={imageSrc}
          alt={label}
          className={cn(
            "w-full h-full object-cover transition-all duration-300",
            selected ? "brightness-100" : "brightness-90 group-hover:brightness-100"
          )}
          loading="lazy"
        />
        
        {/* Selected gradient overlay */}
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"
          />
        )}
      </div>
      
      {/* Label */}
      <span
        className={cn(
          "text-xs sm:text-sm font-medium text-center transition-colors leading-tight max-w-[80px] sm:max-w-[96px] truncate",
          selected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {label}
      </span>
    </motion.button>
  );
};

export default ImageCard;
