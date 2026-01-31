import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCard } from "./ImageCard";
import { cn } from "@/lib/utils";
import { LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Option {
  id: string;
  label: string;
  imageSrc: string;
}

interface ImageCardGridProps {
  options: Option[];
  selectedId?: string;
  variant?: 'square' | 'circle';
  onSelect: (id: string) => void;
  title?: string;
}

export const ImageCardGrid = ({
  options,
  selectedId,
  variant = 'square',
  onSelect,
  title = "Opções",
}: ImageCardGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);

  const handleSelect = (id: string) => {
    onSelect(id);
    setShowAll(false);
  };

  return (
    <>
      <div className="relative">
        {/* Show all button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-2 -top-10 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(true)}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>

        {/* Horizontal scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 touch-pan-x"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {options.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02, duration: 0.15 }}
              className="flex-shrink-0"
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

        {/* Fade gradient on right */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {/* Modal to show all options */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className={cn(
            "grid gap-3 pt-4",
            variant === 'circle' 
              ? "grid-cols-4 sm:grid-cols-5" 
              : "grid-cols-3 sm:grid-cols-4"
          )}>
            {options.map((option) => (
              <ImageCard
                key={option.id}
                id={option.id}
                label={option.label}
                imageSrc={option.imageSrc}
                selected={selectedId === option.id}
                variant={variant}
                onClick={() => handleSelect(option.id)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageCardGrid;
