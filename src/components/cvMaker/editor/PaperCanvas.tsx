import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.6;
const STEP = 0.1;
/** Space kept around the page, in screen pixels. */
const GUTTER = 48;

/**
 * The page on its desk: scrolls, and scales the page to the space left by the side panels ("fit"), or to the
 * zoom picked. The page is scaled with a transform, so its layout (and the PDF) never changes; the wrapper
 * takes the scaled size so the scroll area is right.
 */
export default function PaperCanvas({ children, className }: { children: ReactNode; className?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // null: fit the page to the width available
  const [zoom, setZoom] = useState<number | null>(null);
  const [fit, setFit] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const page = pageRef.current;
    if (!viewport || !page) return;
    const measure = () => {
      // offset sizes are layout sizes: the transform does not change them
      const size = { width: page.offsetWidth, height: page.offsetHeight };
      setPageSize((previous) => (previous.width === size.width && previous.height === size.height ? previous : size));
      if (size.width > 0) {
        // a few pixels of slack: clientWidth is rounded, and a fraction of a pixel too wide shows a scrollbar
        const available = viewport.clientWidth - GUTTER * 2 - 4;
        setFit(Math.max(MIN_ZOOM, Math.min(1, Math.floor((available / size.width) * 100) / 100)));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  const scale = zoom ?? fit;
  const change = (delta: number) =>
    setZoom(Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale + delta)) * 10) / 10);

  return (
    <div className={cn("relative min-h-0 min-w-0 flex-1", className)}>
      <div ref={viewportRef} className="absolute inset-0 overflow-auto">
        <div className="flex min-h-full min-w-fit justify-center px-12 pb-24 pt-10">
          <div style={{ width: pageSize.width * scale, height: pageSize.height * scale }} className="shrink-0">
            <div
              ref={pageRef}
              className="w-fit origin-top-left shadow-[0_1px_3px_rgb(0_0_0/0.08),0_12px_40px_-8px_rgb(15_23_42/0.18)]"
              style={{ transform: scale === 1 ? undefined : `scale(${scale})` }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* zoom */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border bg-background/95 p-1 shadow-md backdrop-blur">
        <button type="button" onClick={() => change(-STEP)} disabled={scale <= MIN_ZOOM} className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40" aria-label="Zoom out">
          <Minus className="size-3.5" />
        </button>
        <button type="button" onClick={() => setZoom(1)} className="min-w-12 rounded-full px-2 py-1 text-xs font-medium tabular-nums transition-colors hover:bg-muted" title="Actual size">
          {Math.round(scale * 100)}%
        </button>
        <button type="button" onClick={() => change(STEP)} disabled={scale >= MAX_ZOOM} className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40" aria-label="Zoom in">
          <Plus className="size-3.5" />
        </button>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => setZoom(null)}
          className={cn("flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors hover:bg-muted", zoom === null ? "text-brand" : "text-muted-foreground")}
          title="Fit the page to the window"
          aria-pressed={zoom === null}
        >
          <Maximize2 className="size-3" /> Fit
        </button>
      </div>
    </div>
  );
}
