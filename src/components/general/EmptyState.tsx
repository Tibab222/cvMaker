import type { ComponentType, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Friendly placeholder for empty lists: says what goes here and how to add the first item.
 */
export default function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-12",
        className,
      )}
    >
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
        className={cn(
          "relative flex items-center justify-center rounded-2xl bg-brand-muted text-brand",
          compact ? "size-9" : "size-12",
        )}
      >
        <span className="absolute inset-0 animate-ping rounded-2xl bg-brand/10 [animation-duration:2.4s]" />
        <Icon className={compact ? "size-4" : "size-5"} />
      </motion.span>
      <div className="space-y-1">
        <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}
