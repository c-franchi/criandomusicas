import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MarqueeProps {
  children: React.ReactNode;
  direction?: "left" | "right";
  speed?: "slow" | "normal" | "fast";
  pauseOnHover?: boolean;
  className?: string;
}

const Marquee = React.forwardRef<HTMLDivElement, MarqueeProps>(
  (
    {
      children,
      direction = "left",
      speed = "normal",
      pauseOnHover = true,
      className,
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(false);

    // Touch drag state for mobile
    const touchStartX = React.useRef(0);
    const touchScrollLeft = React.useRef(0);
    const isTouching = React.useRef(false);

    const speedMap = { slow: 35, normal: 25, fast: 18 };
    const duration = speedMap[speed];

    // Arrow scroll handler
    const scroll = (dir: "left" | "right") => {
      const content = contentRef.current;
      if (!content) return;
      const scrollAmount = 400;
      const current = parseFloat(content.style.getPropertyValue("--scroll-offset") || "0");
      const next = dir === "left" ? current + scrollAmount : current - scrollAmount;
      content.style.setProperty("--scroll-offset", `${next}`);
      content.style.transform = `translateX(${next}px)`;
      content.style.transition = "transform 0.4s ease";
      // Reset after a bit so animation can resume
      setTimeout(() => {
        content.style.transition = "";
        content.style.transform = "";
        content.style.removeProperty("--scroll-offset");
      }, 500);
    };

    // Touch handlers for mobile drag
    const handleTouchStart = (e: React.TouchEvent) => {
      isTouching.current = true;
      setIsPaused(true);
      touchStartX.current = e.touches[0].clientX;
      if (contentRef.current) {
        const transform = window.getComputedStyle(contentRef.current).transform;
        const matrix = new DOMMatrixReadOnly(transform);
        touchScrollLeft.current = matrix.m41;
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isTouching.current || !contentRef.current) return;
      const diff = e.touches[0].clientX - touchStartX.current;
      contentRef.current.style.transition = "none";
      contentRef.current.style.transform = `translateX(${touchScrollLeft.current + diff}px)`;
    };

    const handleTouchEnd = () => {
      isTouching.current = false;
      if (contentRef.current) {
        contentRef.current.style.transition = "";
        contentRef.current.style.transform = "";
      }
      setTimeout(() => setIsPaused(false), 100);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
      if (pauseOnHover) setIsPaused(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setIsPaused(false);
    };

    return (
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn("marquee-container relative w-full overflow-hidden group", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg flex items-center justify-center transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg flex items-center justify-center transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>

        <div
          ref={contentRef}
          className="flex w-max gap-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            animation: `marquee-${direction} ${duration}s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
            willChange: isPaused ? "auto" : "transform",
          }}
        >
          {children}
          {children}
        </div>
      </div>
    );
  }
);

Marquee.displayName = "Marquee";

export { Marquee };
export type { MarqueeProps };
