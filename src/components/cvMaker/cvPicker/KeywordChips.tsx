import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

interface KeywordChipsProps {
  matched: string[];
  missing?: string[];
  // how many chips are shown before collapsing the rest behind a "+N" toggle
  limit?: number;
  size?: "sm" | "xs";
  className?: string;
}

export default function KeywordChips({ matched, missing = [], limit = 6, size = "sm", className }: KeywordChipsProps) {
  const [expanded, setExpanded] = useState(false);

  const chips = [
    ...matched.map(keyword => ({ keyword, isMatched: true })),
    ...missing.map(keyword => ({ keyword, isMatched: false })),
  ];
  const visibleChips = expanded ? chips : chips.slice(0, limit);
  const hiddenCount = chips.length - visibleChips.length;

  const toggleExpanded = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // don't toggle the card selection
    setExpanded(prev => !prev);
  };

  const chipClass = cn(
    "inline-flex items-center gap-1 rounded-full border font-medium leading-none",
    size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-1"
  );
  const iconSize = size === "xs" ? 9 : 10;

  return (
    <AnimatePresence initial={false}>
      {chips.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={cn("overflow-hidden", className)}
        >
          <motion.div layout className="flex flex-wrap gap-1 pt-1">
            <AnimatePresence initial={false}>
              {visibleChips.map(({ keyword, isMatched }) => (
                <motion.span
                  layout
                  key={`${isMatched ? "m" : "x"}:${keyword}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  title={isMatched ? "Found in this item" : "Missing from this item"}
                  className={cn(
                    chipClass,
                    isMatched
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "border-dashed border-muted-foreground/30 text-muted-foreground/80"
                  )}
                >
                  {isMatched ? <Check size={iconSize} strokeWidth={3} /> : <Minus size={iconSize} strokeWidth={3} />}
                  {keyword}
                </motion.span>
              ))}
            </AnimatePresence>

            {chips.length > limit && (
              <motion.button
                layout
                type="button"
                onClick={toggleExpanded}
                className={cn(chipClass, "border-transparent bg-muted text-muted-foreground hover:text-foreground transition-colors")}
              >
                {expanded ? "Show less" : `+${hiddenCount}`}
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
