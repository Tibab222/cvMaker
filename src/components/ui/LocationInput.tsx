import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface LocationSuggestion {
  /** Formatted as "City, Country" (or "City, Region, Country" for US/CA) */
  label: string;
  city: string;
  region?: string;
  country: string;
  countryCode?: string;
  lat?: string;
  lon?: string;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string, suggestion?: LocationSuggestion) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  /** Debounce delay in ms before hitting Nominatim. Default 400. */
  debounceMs?: number;
  /** Minimum characters before searching. Default 3. */
  minChars?: number;
  /** Max suggestions shown. Default 6. */
  limit?: number;
}

/* -------------------------------------------------------------------------- */
/*  Nominatim helpers                                                          */
/* -------------------------------------------------------------------------- */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/** Countries where a state/province genuinely disambiguates a city name. */
const REGION_COUNTRIES = new Set(["us", "ca", "au", "br", "in", "mx"]);

type NominatimResult = {
  lat: string;
  lon: string;
  addresstype?: string;
  address?: Record<string, string>;
};

/** Only keep settlement-level results — never shops, bars or streets. */
const SETTLEMENT_TYPES = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "hamlet",
  "borough",
  "suburb",
  "county",
  "state",
  "province",
  "region",
  "country",
]);

function formatResult(result: NominatimResult): LocationSuggestion | null {
  if (result.addresstype && !SETTLEMENT_TYPES.has(result.addresstype)) return null;

  const a = result.address ?? {};
  const city =
    a["city"] ?? a["town"] ?? a["village"] ?? a["municipality"] ?? a["hamlet"] ?? a["county"];
  const country = a["country"];
  if (!city || !country) return null;


  const countryCode = a["country_code"];
  const region = a["state"] ?? a["province"];
  const useRegion = region && countryCode && REGION_COUNTRIES.has(countryCode);

  return {
    label: useRegion ? `${city}, ${region}, ${country}` : `${city}, ${country}`,
    city,
    region: useRegion ? region : undefined,
    country,
    countryCode,
    lat: result.lat,
    lon: result.lon,
  };
}

/** In-memory cache so repeated keystrokes never re-hit the API. */
const cache = new Map<string, LocationSuggestion[]>();

async function searchLocations(
  query: string,
  limit: number,
  signal: AbortSignal,
): Promise<LocationSuggestion[]> {
  const key = `${query.toLowerCase()}|${limit}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "en",
    limit: String(limit * 3),
    dedupe: "1",
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Nominatim responded ${response.status}`);

  const data = (await response.json()) as NominatimResult[];
  const seen = new Set<string>();
  const suggestions: LocationSuggestion[] = [];

  for (const item of data) {
    const formatted = formatResult(item);
    if (!formatted || seen.has(formatted.label)) continue;
    seen.add(formatted.label);
    suggestions.push(formatted);
    if (suggestions.length >= limit) break;
  }

  cache.set(key, suggestions);
  return suggestions;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function LocationInput({
  value,
  onChange,
  placeholder = "City, Country (optional)",
  id,
  name,
  className,
  disabled,
  debounceMs = 400,
  minChars = 3,
  limit = 6,
}: LocationInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-listbox`;

  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Set right after a pick so the debounce doesn't immediately re-open. */
  const skipNextSearch = useRef(false);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Keep local text in sync when the parent resets the field.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced Nominatim lookup.
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < minChars) {
      setSuggestions([]);
      setLoading(false);
      setOffline(false);
      abortRef.current?.abort();
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      searchLocations(trimmed, limit, controller.signal)
        .then((results) => {
          setSuggestions(results);
          setOffline(false);
          setActiveIndex(-1);
          if (results.length > 0) setOpen(true);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          // Offline or blocked: fall back silently to free text.
          setSuggestions([]);
          setOffline(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, minChars, limit]);

  // Close on outside click.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const select = useCallback(
    (suggestion: LocationSuggestion) => {
      skipNextSearch.current = true;
      setQuery(suggestion.label);
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      onChange(suggestion.label, suggestion);
    },
    [onChange],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0) {
        event.preventDefault();
        const picked = suggestions[activeIndex];
        if (picked) select(picked);
      } else {
        setOpen(false); // free-text fallback: keep whatever was typed
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && (loading || suggestions.length > 0);
  const exactMatch = useMemo(
    () => suggestions.some((s) => s.label.toLowerCase() === query.trim().toLowerCase()),
    [suggestions, query],
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3",
          "transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40",
          disabled && "opacity-60",
        )}
      >
        <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          id={inputId}
          name={name}
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        {!loading && offline && (
          <span title="Suggestions unavailable — type freely">
            <WifiOff className="size-4 shrink-0 text-muted-foreground" />
          </span>
        )}
        {!loading && !offline && exactMatch && (
          <Check className="size-4 shrink-0 text-primary" aria-hidden />
        )}
        {!loading && query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              skipNextSearch.current = true;
              setQuery("");
              setSuggestions([]);
              setOpen(false);
              onChange("");
            }}
            className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear location"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg"
          >
            {loading && suggestions.length === 0 && (
              <li className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Searching cities…
              </li>
            )}
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.label}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(suggestion);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm transition-colors",
                  index === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground",
                )}
              >
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  <span className="font-medium">{suggestion.city}</span>
                  <span className="text-muted-foreground">
                    {suggestion.region ? `, ${suggestion.region}` : ""}, {suggestion.country}
                  </span>
                </span>
              </li>
            ))}
            {!loading && suggestions.length > 0 && (
              <li className="px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground">
                Not listed? Keep typing — free text is accepted.
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LocationInput;
