import { useRef } from "react";
import { motion } from "framer-motion";
import { ImageCard } from "./ImageCard";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  onShowAll?: () => void;
}

export const ImageCardGrid = ({
  options,
  selectedId,
  variant = 'square',
  onSelect,
  onShowAll,
}: ImageCardGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative group">
      {/* Scroll buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
        onClick={() => scroll('left')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-8 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
        onClick={() => scroll('right')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Show all button */}
      {onShowAll && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onShowAll}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      )}

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-3 overflow-x-auto scrollbar-hide pb-2 pr-10",
          "scroll-smooth snap-x snap-mandatory"
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {options.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className="snap-start flex-shrink-0"
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
      </div>
    </div>
  );
};

export default ImageCardGrid;
