import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCard } from "./ImageCard";
import { cn } from "@/lib/utils";
import { LayoutGrid, MoreHorizontal, Send, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  showOther?: boolean;
  otherLabel?: string;
  onOtherSelect?: (customValue: string) => void;
}

// Skeleton shimmer component for loading state
const CardSkeleton = ({ variant = 'square' }: { variant?: 'square' | 'circle' }) => (
  <div className="flex-shrink-0 animate-pulse">
    <div className={cn(
      "bg-muted/60 relative overflow-hidden",
      variant === 'circle' 
        ? "w-16 h-16 sm:w-20 sm:h-20 rounded-full" 
        : "w-20 h-20 sm:w-24 sm:h-24 rounded-xl"
    )}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    </div>
    <div className="h-3 w-12 mt-1.5 mx-auto bg-muted/40 rounded" />
  </div>
);

export const ImageCardGrid = ({
  options,
  selectedId,
  variant = 'square',
  onSelect,
  title = "Opções",
  showOther = true,
  otherLabel = "Outro",
  onOtherSelect,
}: ImageCardGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollState);
      return () => el.removeEventListener('scroll', updateScrollState);
    }
  }, [updateScrollState, options]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 150);
    }
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 150);
    }
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const scrollTo = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setShowAll(false);
  };

  const handleOtherClick = () => {
    setShowOtherInput(true);
    setShowAll(false);
  };

  const handleOtherSubmit = () => {
    if (otherValue.trim()) {
      if (onOtherSelect) {
        onOtherSelect(otherValue.trim());
      } else {
        onSelect(`custom:${otherValue.trim()}`);
      }
      setShowOtherInput(false);
      setOtherValue("");
    }
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

        {/* Custom input mode */}
        {showOtherInput ? (
          <div className="flex gap-2 items-center">
            <Input
              autoFocus
              value={otherValue}
              onChange={(e) => setOtherValue(e.target.value)}
              placeholder="Digite sua opção..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleOtherSubmit()}
            />
            <Button onClick={handleOtherSubmit} disabled={!otherValue.trim()}>
              <Send className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={() => setShowOtherInput(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <>
            {/* Navigation arrows */}
            {canScrollLeft && (
              <button
                onClick={() => scrollTo('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-background/90 border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scrollTo('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-background/90 border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Loading indicator */}
            <AnimatePresence>
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Horizontal scroll container with drag support */}
            <div
              ref={scrollRef}
              className={cn(
                "flex gap-3 overflow-x-auto pb-2 px-1 cursor-grab select-none transition-opacity",
                isDragging && "cursor-grabbing",
                isLoading && "opacity-70"
              )}
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
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
                    onClick={() => !isDragging && onSelect(option.id)}
                  />
                </motion.div>
              ))}
              
              {/* "Outro" option */}
              {showOther && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: options.length * 0.02, duration: 0.15 }}
                  className="flex-shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => !isDragging && handleOtherClick()}
                    className={cn(
                      "relative group flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all duration-300",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    )}
                  >
                    <div
                      className={cn(
                        "relative overflow-hidden transition-all duration-300 flex items-center justify-center",
                        variant === 'circle' 
                          ? "w-16 h-16 sm:w-20 sm:h-20 rounded-full" 
                          : "w-20 h-20 sm:w-24 sm:h-24 rounded-xl",
                        "bg-muted/80 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <MoreHorizontal className="w-6 h-6 text-muted-foreground" />
                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                          {otherLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              )}
            </div>

            {/* Fade gradients */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            )}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            )}
          </>
        )}
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
            
            {/* "Outro" option in modal */}
            {showOther && (
              <button
                type="button"
                onClick={handleOtherClick}
                className={cn(
                  "relative group flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all duration-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <div
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 flex items-center justify-center",
                    variant === 'circle' 
                      ? "w-16 h-16 sm:w-20 sm:h-20 rounded-full" 
                      : "w-20 h-20 sm:w-24 sm:h-24 rounded-xl",
                    "bg-muted/80 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted"
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <MoreHorizontal className="w-6 h-6 text-muted-foreground" />
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                      {otherLabel}
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageCardGrid;
