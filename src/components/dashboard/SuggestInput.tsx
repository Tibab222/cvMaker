import { useId, useMemo, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { filterSuggestions, matchRange, type Suggestion } from "@/lib/suggest";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  icon?: ComponentType<{ className?: string }>;
  autoFocus?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
}

function Highlighted({ value, query }: { value: string; query: string }) {
  const range = matchRange(value, query);
  if (!range) return <>{value}</>;
  return (
    <>
      {value.slice(0, range[0])}
      <mark className="rounded-sm bg-brand-muted px-0 text-brand">{value.slice(range[0], range[1])}</mark>
      {value.slice(range[1])}
    </>
  );
}

/**
 * Text field that offers what was typed before (companies, job titles of past applications).
 * Free text stays allowed: a suggestion is a shortcut, never a constraint. Arrow keys, Enter and Escape work.
 */
export default function SuggestInput({ id, value, onChange, suggestions, placeholder, icon: Icon, autoFocus, invalid, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const blurTimer = useRef<number | undefined>(undefined);
  const visible = useMemo(() => filterSuggestions(suggestions, value), [suggestions, value]);
  const shown = open && visible.length > 0;

  const pick = (suggestion: Suggestion) => {
    onChange(suggestion.value);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}
      <Input
        id={id}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={rest["aria-label"]}
        aria-invalid={invalid || undefined}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        className={cn(Icon && "pl-9")}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          window.clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        // a click on a suggestion blurs the input first: give it time to land
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (!visible.length) return;
            event.preventDefault();
            setOpen(true);
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((current) => (current + step + visible.length) % visible.length);
          } else if (event.key === "Enter" && shown) {
            // never submits a half-filled form from here: picks the highlighted one, or just keeps what was typed
            event.preventDefault();
            if (active >= 0) pick(visible[active]);
            else setOpen(false);
          } else if (event.key === "Escape" && shown) {
            // close the list, not the dialog around it
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      <AnimatePresence>
        {shown && (
          <motion.ul
            id={listId}
            role="listbox"
            // the list scrolls, so the browser would put it in the tab order: Tab must go to the next field
            tabIndex={-1}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 origin-top overflow-y-auto rounded-lg border border-border/80 bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {visible.map((suggestion, index) => (
              <li
                key={suggestion.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(suggestion)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
                  index === active ? "bg-accent text-accent-foreground" : "text-foreground",
                )}
              >
                <History className="size-3.5 shrink-0 text-muted-foreground" />
                {/* two lines: the value keeps the whole width, even in a narrow field */}
                <span className="min-w-0 flex-1">
                  <span className="block truncate" title={suggestion.value}>
                    <Highlighted value={suggestion.value} query={value} />
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {suggestion.hint && `${suggestion.hint} · `}
                    {suggestion.count > 1 ? `${suggestion.count} applications` : "1 application"}
                  </span>
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
