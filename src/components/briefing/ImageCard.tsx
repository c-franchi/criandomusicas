import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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
        "relative group flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-300",
        "hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected && "ring-2 ring-primary shadow-lg shadow-primary/20"
      )}
      whileHover={{ y: -4 }}
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
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
            : "ring-1 ring-border/50 group-hover:ring-primary/50"
        )}
      >
        <img
          src={imageSrc}
          alt={label}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Selected overlay */}
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-primary/30 flex items-center justify-center"
          >
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Label */}
      <span
        className={cn(
          "text-xs sm:text-sm font-medium text-center transition-colors line-clamp-2",
          selected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {label}
      </span>
    </motion.button>
  );
};

export default ImageCard;
