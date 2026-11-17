import type { ComponentType, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Buttons shown on the right. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Sticky header shared by every main panel: same height, typography and blur everywhere.
 */
export default function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/75 px-4 py-3 backdrop-blur-xl md:px-6",
        className,
      )}
    >
      {Icon && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand"
        >
          <Icon className="size-4.5" />
        </motion.span>
      )}
      <motion.div
        className="min-w-0"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      >
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
      </motion.div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
