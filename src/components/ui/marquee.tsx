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
    const animationClass = direction === "left" 
      ? `animate-marquee-left-${speed}` 
      : `animate-marquee-right-${speed}`;

    return (
      <div
        ref={ref}
        className={cn(
          "marquee-container w-full overflow-hidden",
          className
        )}
      >
        <div
          className={cn(
            "flex w-max gap-6",
            animationClass,
            pauseOnHover && "hover:[animation-play-state:paused]"
          )}
          style={{ 
            willChange: "transform",
            animationPlayState: "running"
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
