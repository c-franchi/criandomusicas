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

    const animationClass = direction === "left" 
      ? `animate-marquee-left-${speed}` 
      : `animate-marquee-right-${speed}`;

    return (
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "marquee-container w-full overflow-hidden",
          className
        )}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          ref={contentRef}
          className={cn(
            "flex w-max gap-6",
            animationClass
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
