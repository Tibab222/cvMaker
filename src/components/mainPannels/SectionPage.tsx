import type { ComponentType, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listItem, spring } from "@/lib/motion";
import { getModifierKeyLabel } from "@/hooks/use-keyboard-shortcut";
import PageHeader from "../general/PageHeader";
import EmptyState from "../general/EmptyState";

interface SectionPageProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  /** Singular noun for the add button and the counter ("experience" -> "Add experience", "3 experiences"). */
  noun: string;
  items: { key: string; node: ReactNode }[];
  isAdding: boolean;
  onAdd: () => void;
  /** Editor for the item being created, shown at the end of the list while isAdding. */
  newItem: ReactNode;
  emptyDescription: string;
  layout?: "list" | "grid";
}

/**
 * Shared layout of the profile sections (experience, education, projects, skills),
 * so they all look, animate and behave the same way.
 */
export default function SectionPage({
  icon,
  title,
  description,
  noun,
  items,
  isAdding,
  onAdd,
  newItem,
  emptyDescription,
  layout = "list",
}: SectionPageProps) {
  const count = items.length;
  const addButton = (
    <Button onClick={onAdd} disabled={isAdding} size="sm" className="gap-1.5 shadow-sm shadow-brand/20">
      <Plus className="size-4" />
      Add {noun}
      <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-normal sm:inline">{getModifierKeyLabel()}+N</kbd>
    </Button>
  );

  return (
    <div className="flex min-h-full w-full flex-col">
      <PageHeader
        icon={icon}
        title={title}
        description={count > 0 ? `${count} ${noun}${count > 1 ? "s" : ""} · ${description}` : description}
        actions={addButton}
      />

      <div className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-6">
        {count === 0 && !isAdding ? (
          <EmptyState icon={icon} title={`No ${noun} yet`} description={emptyDescription} action={addButton} />
        ) : (
          <motion.div
            className={cn(layout === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4")}
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((item) => (
                <motion.div key={item.key} layout="position" variants={listItem} exit="exit" transition={spring}>
                  {item.node}
                </motion.div>
              ))}
              {isAdding && (
                <motion.div
                  key="__new__"
                  layout="position"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={spring}
                >
                  {newItem}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
