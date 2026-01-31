import * as React from "react";
import { cn } from "@/lib/utils";

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
    const [isPaused, setIsPaused] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [scrollLeft, setScrollLeft] = React.useState(0);

    const animationClass = direction === "left" 
      ? `animate-marquee-left-${speed}` 
      : `animate-marquee-right-${speed}`;

    const handleMouseEnter = () => {
      if (pauseOnHover) {
        setIsPaused(true);
      }
    };

    const handleMouseLeave = () => {
      setIsPaused(false);
      setIsDragging(false);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!containerRef.current || !isPaused) return;
      setIsDragging(true);
      setStartX(e.pageX - containerRef.current.offsetLeft);
      setScrollLeft(containerRef.current.scrollLeft);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault();
      const x = e.pageX - containerRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      containerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      if (!containerRef.current) return;
      setIsPaused(true);
      setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
      setScrollLeft(containerRef.current.scrollLeft);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!containerRef.current) return;
      const x = e.touches[0].pageX - containerRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      containerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleTouchEnd = () => {
      setIsPaused(false);
    };

    return (
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "marquee-container w-full overflow-hidden",
          isPaused && "overflow-x-auto cursor-grab",
          isDragging && "cursor-grabbing",
          className
        )}
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={contentRef}
          className={cn(
            "flex w-max gap-6",
            !isPaused && animationClass
          )}
          style={{ 
            willChange: isPaused ? "auto" : "transform",
            animationPlayState: isPaused ? "paused" : "running"
          }}
        >
          {/* Original cards */}
          {children}
          {/* Duplicated cards for seamless loop */}
          {children}
        </div>
      </div>
    );
  }
);

Marquee.displayName = "Marquee";

export { Marquee };
export type { MarqueeProps };
