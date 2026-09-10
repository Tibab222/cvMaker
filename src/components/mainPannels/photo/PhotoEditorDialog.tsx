import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { RotateCcw, RotateCw, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
    INITIAL_TRANSFORM,
    MAX_ZOOM,
    MIN_ZOOM,
    clampOffset,
    displayScale,
    loadImage,
    normalizeRotation,
    renderCroppedPhoto,
    updateTransform,
    type ImageSize,
    type PhotoTransform,
} from "./photoEditing";

const VIEWPORT = 288; // crop square size in CSS px
const PAN_STEP = 8;
const WHEEL_ZOOM_SPEED = 0.002;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

interface PhotoEditorDialogProps {
    source: string | null; // image to edit (data URL); the dialog is open while this is set
    onCancel: () => void;
    onApply: (photo: string) => void;
}

export default function PhotoEditorDialog({ source, onCancel, onApply }: PhotoEditorDialogProps) {
    return (
        <Dialog open={source !== null} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Edit photo</DialogTitle>
                    <DialogDescription>Drag to reposition, scroll or use the slider to zoom.</DialogDescription>
                </DialogHeader>
                {/* Mounted per opening, so every edit starts from a fresh transform */}
                {source && <PhotoEditor source={source} onCancel={onCancel} onApply={onApply} />}
            </DialogContent>
        </Dialog>
    );
}

function PhotoEditor({ source, onCancel, onApply }: { source: string; onCancel: () => void; onApply: (photo: string) => void }) {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [transform, setTransform] = useState<PhotoTransform>(INITIAL_TRANSFORM);
    const dragStart = useRef<{ pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadImage(source)
            .then((img) => !cancelled && setImage(img))
            .catch(() => !cancelled && setLoadFailed(true));
        return () => { cancelled = true; };
    }, [source]);

    const size: ImageSize | null = image ? { width: image.naturalWidth, height: image.naturalHeight } : null;

    const change = (getChanges: (current: PhotoTransform) => Partial<Pick<PhotoTransform, "zoom" | "rotation">>) => {
        if (!size) return;
        setTransform((current) => updateTransform(current, getChanges(current), size, VIEWPORT));
    };

    const pan = (getOffset: (current: PhotoTransform) => { offsetX: number; offsetY: number }) => {
        if (!size) return;
        setTransform((current) => clampOffset({ ...current, ...getOffset(current) }, size, VIEWPORT));
    };

    const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (!size) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, offsetX: transform.offsetX, offsetY: transform.offsetY };
    };

    const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const start = dragStart.current;
        if (!start) return;
        pan(() => ({
            offsetX: start.offsetX + e.clientX - start.pointerX,
            offsetY: start.offsetY + e.clientY - start.pointerY,
        }));
    };

    const endDrag = () => { dragStart.current = null; };

    const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
        change((current) => ({ zoom: clampZoom(current.zoom * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED)) }));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? PAN_STEP * 4 : PAN_STEP;
        // Arrows move the image, like dragging does
        const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        };
        if (moves[e.key]) {
            const [dx, dy] = moves[e.key];
            pan((current) => ({ offsetX: current.offsetX + dx, offsetY: current.offsetY + dy }));
        } else if (e.key === "+" || e.key === "=") {
            change((current) => ({ zoom: clampZoom(current.zoom + 0.1) }));
        } else if (e.key === "-") {
            change((current) => ({ zoom: clampZoom(current.zoom - 0.1) }));
        } else {
            return;
        }
        e.preventDefault();
    };

    const handleApply = () => {
        if (!image) return;
        try {
            onApply(renderCroppedPhoto(image, transform, VIEWPORT));
        } catch (err) {
            console.error("Error rendering photo:", err);
            toast.error("Could not process this photo.");
        }
    };

    const scale = size ? displayScale(size, VIEWPORT, transform) : 0;

    return (
        <>
            <div
                role="application"
                aria-label="Photo crop area. Drag or use arrow keys to move, plus and minus to zoom."
                tabIndex={0}
                className="relative mx-auto overflow-hidden rounded-lg bg-muted touch-none cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-ring"
                style={{ width: VIEWPORT, height: VIEWPORT }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onWheel={handleWheel}
                onKeyDown={handleKeyDown}
            >
                {size ? (
                    <img
                        src={source}
                        alt=""
                        draggable={false}
                        className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
                        style={{
                            width: size.width * scale,
                            height: size.height * scale,
                            transform: `translate(-50%, -50%) translate(${transform.offsetX}px, ${transform.offsetY}px) rotate(${transform.rotation}deg)`,
                        }}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        {loadFailed ? "This image could not be opened." : <Spinner className="size-6" />}
                    </div>
                )}
                {/* Circular guide: the resume shows the photo as a circle; the corners are kept in the saved square */}
                <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] ring-2 ring-white/80" />
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <ZoomOut className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <input
                        type="range"
                        aria-label="Zoom"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={transform.zoom}
                        disabled={!size}
                        onChange={(e) => change(() => ({ zoom: Number(e.target.value) }))}
                        className="w-full cursor-pointer accent-primary"
                    />
                    <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" aria-label="Rotate left 90°" title="Rotate left 90°" disabled={!size}
                        onClick={() => change((current) => ({ rotation: normalizeRotation(current.rotation - 90) }))}>
                        <RotateCcw />
                    </Button>
                    <input
                        type="range"
                        aria-label="Rotation"
                        min={-180}
                        max={180}
                        step={1}
                        value={transform.rotation}
                        disabled={!size}
                        onChange={(e) => change(() => ({ rotation: Number(e.target.value) }))}
                        className="w-full cursor-pointer accent-primary"
                    />
                    <Button variant="ghost" size="icon" aria-label="Rotate right 90°" title="Rotate right 90°" disabled={!size}
                        onClick={() => change((current) => ({ rotation: normalizeRotation(current.rotation + 90) }))}>
                        <RotateCw />
                    </Button>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{Math.round(transform.rotation)}°</span>
                </div>
            </div>

            <DialogFooter>
                <Button variant="ghost" className="sm:mr-auto" disabled={!size} onClick={() => setTransform(INITIAL_TRANSFORM)}>
                    <Undo2 /> Reset
                </Button>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleApply} disabled={!image}>Apply</Button>
            </DialogFooter>
        </>
    );
}
