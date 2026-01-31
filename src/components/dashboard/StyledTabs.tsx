import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const StyledTabs = TabsPrimitive.Root;

const StyledTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-auto w-full items-center justify-center gap-2 rounded-xl bg-muted/30 p-2 backdrop-blur-sm",
      className
    )}
    {...props}
  />
));
StyledTabsList.displayName = "StyledTabsList";

const StyledTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-300",
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      // Inactive state
      "bg-transparent text-muted-foreground border border-transparent hover:bg-muted/50 hover:text-foreground",
      // Active state - gradient style
      "data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-accent data-[state=active]:to-primary",
      "data-[state=active]:text-primary-foreground data-[state=active]:border-0",
      "data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25",
      "data-[state=active]:scale-[1.02]",
      className
    )}
    {...props}
  />
));
StyledTabsTrigger.displayName = "StyledTabsTrigger";

const StyledTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
StyledTabsContent.displayName = "StyledTabsContent";

export { StyledTabs, StyledTabsList, StyledTabsTrigger, StyledTabsContent };
