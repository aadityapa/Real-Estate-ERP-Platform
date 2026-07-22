import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground ring-border",
        primary: "bg-primary/10 text-primary ring-primary/20",
        success: "bg-success-subtle text-success ring-success/30",
        warning: "bg-warning-subtle text-warning ring-warning/30",
        danger: "bg-danger-subtle text-danger ring-danger/30",
        info: "bg-info-subtle text-info ring-info/30",
        outline: "text-foreground ring-border",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional leading dot for status semantics (color is never the only signal). */
  dot?: boolean;
}

export function Badge({
  className,
  variant,
  dot = false,
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export { badgeVariants };
