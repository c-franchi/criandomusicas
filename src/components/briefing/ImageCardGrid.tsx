import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImageCard } from "./ImageCard";
import { cn } from "@/lib/utils";
import { LayoutGrid, MoreHorizontal, Send } from "lucide-react";
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
                </motion.div>
              )}
            </div>

            {/* Fade gradient on right */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
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
