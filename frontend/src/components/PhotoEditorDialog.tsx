import {
  FlipHorizontal2,
  Loader2,
  RotateCcw,
  RotateCw,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { primaryButtonClass, secondaryButtonClass } from "@/components/design-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

/** Size of the on-screen crop square, in CSS pixels. */
const VIEW = 280;
/** Size of the exported square image, in pixels. */
const OUTPUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Offset = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Crop editor for profile photos: drag to reposition, pinch / scroll / slider
 * to zoom, rotate in 90° steps and flip. The image always covers the square,
 * and Apply exports a square JPEG of what is inside it.
 */
export function PhotoEditorDialog({
  file,
  onCancel,
  onApply,
}: {
  file: File | null;
  onCancel: () => void;
  onApply: (edited: File) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    setImage(null);
    setLoadError(false);
    setZoom(1);
    setRotation(0);
    setFlipped(false);
    setOffset({ x: 0, y: 0 });
    if (!file) return;
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => setImage(next);
    next.onerror = () => setLoadError(true);
    next.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const sideways = rotation % 180 !== 0;
  const naturalWidth = image?.naturalWidth ?? 1;
  const naturalHeight = image?.naturalHeight ?? 1;
  // Width and height of the image as it appears after rotation.
  const shownWidth = sideways ? naturalHeight : naturalWidth;
  const shownHeight = sideways ? naturalWidth : naturalHeight;
  const scale = (VIEW / Math.min(shownWidth, shownHeight)) * zoom;

  // Keep the image covering the whole square.
  const clampOffset = useCallback(
    (next: Offset, nextScale = scale): Offset => {
      const maxX = Math.max(0, (shownWidth * nextScale - VIEW) / 2);
      const maxY = Math.max(0, (shownHeight * nextScale - VIEW) / 2);
      return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
    },
    [scale, shownWidth, shownHeight],
  );

  function applyZoom(nextZoom: number) {
    const value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const nextScale = (VIEW / Math.min(shownWidth, shownHeight)) * value;
    setZoom(value);
    setOffset((current) => clampOffset(current, nextScale));
  }

  function rotate(step: 90 | -90) {
    setRotation((current) => (current + step + 360) % 360);
    setOffset({ x: 0, y: 0 });
  }

  function reset() {
    setZoom(1);
    setRotation(0);
    setFlipped(false);
    setOffset({ x: 0, y: 0 });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom };
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      applyZoom(pinchStart.current.zoom * (distance / pinchStart.current.distance));
      return;
    }
    setOffset((current) =>
      clampOffset({
        x: current.x + event.clientX - previous.x,
        y: current.y + event.clientY - previous.y,
      }),
    );
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 20 : 5;
    const moves: Record<string, Offset> = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setOffset((current) => clampOffset({ x: current.x + move.x, y: current.y + move.y }));
    } else if (event.key === "+" || event.key === "=") applyZoom(zoom + 0.1);
    else if (event.key === "-") applyZoom(zoom - 0.1);
  }

  async function exportImage() {
    if (!image || !file) return;
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available.");
      const ratio = OUTPUT / VIEW;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, OUTPUT, OUTPUT);
      context.imageSmoothingQuality = "high";
      // Same transform order as the on-screen preview.
      context.translate(OUTPUT / 2 + offset.x * ratio, OUTPUT / 2 + offset.y * ratio);
      context.rotate((rotation * Math.PI) / 180);
      context.scale((flipped ? -1 : 1) * scale * ratio, scale * ratio);
      context.drawImage(image, -naturalWidth / 2, -naturalHeight / 2);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Could not export the photo.");
      const baseName = file.name.replace(/\.[^.]+$/, "") || "profile-photo";
      onApply(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
    } finally {
      setExporting(false);
    }
  }

  const toolButton =
    "grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-50";

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit profile photo</DialogTitle>
          <DialogDescription>
            Drag to reposition, then zoom, rotate or flip. The circle shows what others will see.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <div
            role="application"
            aria-label="Photo crop area. Drag or use arrow keys to move, plus and minus to zoom."
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(event) => applyZoom(zoom - event.deltaY * 0.0015)}
            onKeyDown={onKeyDown}
            className="relative cursor-grab touch-none overflow-hidden rounded-lg bg-muted outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/30 active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
          >
            {image && (
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
                style={{
                  width: naturalWidth,
                  height: naturalHeight,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${(flipped ? -1 : 1) * scale}, ${scale})`,
                }}
              />
            )}
            {!image && !loadError && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            {loadError && (
              <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-destructive">
                This image could not be opened. Try a JPG, PNG or WebP file.
              </p>
            )}
            {/* Round guide: dims everything outside the avatar circle. */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(10,20,35,0.55)] ring-2 ring-white/80" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => applyZoom(zoom - 0.25)}
            aria-label="Zoom out"
            className="text-muted-foreground hover:text-foreground"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <Slider
            aria-label="Zoom"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={[zoom]}
            onValueChange={([value]) => applyZoom(value ?? MIN_ZOOM)}
            disabled={!image}
          />
          <button
            type="button"
            onClick={() => applyZoom(zoom + 0.25)}
            aria-label="Zoom in"
            className="text-muted-foreground hover:text-foreground"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => rotate(-90)}
            disabled={!image}
            aria-label="Rotate left"
            title="Rotate left"
            className={toolButton}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => rotate(90)}
            disabled={!image}
            aria-label="Rotate right"
            title="Rotate right"
            className={toolButton}
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            disabled={!image}
            aria-label="Flip horizontally"
            aria-pressed={flipped}
            title="Flip horizontally"
            className={`${toolButton} ${flipped ? "border-gold/60 bg-gold/10" : ""}`}
          >
            <FlipHorizontal2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={!image}
            aria-label="Reset changes"
            title="Reset"
            className={toolButton}
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void exportImage()}
            disabled={!image || exporting}
            className={primaryButtonClass}
          >
            {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
            Use this photo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
