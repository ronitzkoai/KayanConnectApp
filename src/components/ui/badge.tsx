import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-2xl border-2 px-4 py-1.5 text-xs font-bold transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default: "border-accent/30 bg-gradient-to-r from-accent/90 to-earth-dark/90 text-accent-foreground hover:from-accent hover:to-earth-dark shadow-md",
        secondary: "border-primary/30 bg-gradient-to-r from-primary/80 to-secondary/80 text-primary-foreground hover:from-primary/90 hover:to-secondary/90",
        destructive: "border-destructive/30 bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-md",
        outline: "text-foreground border-muted hover:bg-muted/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
