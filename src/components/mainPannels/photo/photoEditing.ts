// Pure helpers behind the profile photo editor: file validation, pan/zoom/rotate
// geometry and the final canvas render. Kept free of React so the maths is easy to follow.

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

// ~43mm at 300dpi, far more than the resume ever displays, while keeping infos.json small (~60-100KB).
const OUTPUT_SIZE = 512;
const OUTPUT_QUALITY = 0.9;

export interface PhotoTransform {
    zoom: number;     // 1 = the smallest zoom at which the image still fills the crop square
    rotation: number; // degrees, clockwise
    offsetX: number;  // image centre relative to crop centre, in viewport px
    offsetY: number;
}

export const INITIAL_TRANSFORM: PhotoTransform = { zoom: 1, rotation: 0, offsetX: 0, offsetY: 0 };

export interface ImageSize {
    width: number;
    height: number;
}

/** Returns an error message, or null if the file can be edited. */
export function validatePhotoFile(file: File): string | null {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
        return "Unsupported format. Please use a JPEG, PNG or WebP image.";
    }
    if (file.size > MAX_PHOTO_UPLOAD_BYTES) {
        return "Image is too large. The maximum size is 10 MB.";
    }
    return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
        reader.readAsDataURL(file);
    });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not decode image"));
        img.src = src;
    });
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function rotate(x: number, y: number, degrees: number) {
    const cos = Math.cos(toRadians(degrees));
    const sin = Math.sin(toRadians(degrees));
    return { x: x * cos - y * sin, y: x * sin + y * cos };
}

// Side of the crop square's bounding box, measured along the rotated image's axes.
function rotatedCropExtent(viewport: number, rotation: number) {
    const rad = toRadians(rotation);
    return viewport * (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
}

/** Image px -> viewport px scale for a transform. zoom 1 covers the crop square exactly. */
export function displayScale(image: ImageSize, viewport: number, transform: PhotoTransform) {
    const coverScale = rotatedCropExtent(viewport, transform.rotation) / Math.min(image.width, image.height);
    return coverScale * transform.zoom;
}

/** Limits panning so the image always covers the whole crop square (no empty corners). */
export function clampOffset(transform: PhotoTransform, image: ImageSize, viewport: number): PhotoTransform {
    const scale = displayScale(image, viewport, transform);
    const halfExtent = rotatedCropExtent(viewport, transform.rotation) / 2;
    const maxX = Math.max(0, (image.width * scale) / 2 - halfExtent);
    const maxY = Math.max(0, (image.height * scale) / 2 - halfExtent);

    // Clamp in the image's own frame, where its edges are axis-aligned, then rotate back.
    const local = rotate(transform.offsetX, transform.offsetY, -transform.rotation);
    const clamped = rotate(clamp(local.x, -maxX, maxX), clamp(local.y, -maxY, maxY), transform.rotation);
    return { ...transform, offsetX: clamped.x, offsetY: clamped.y };
}

/**
 * Applies a new zoom and/or rotation while keeping the same point of the image under
 * the crop centre, then re-clamps the pan.
 */
export function updateTransform(
    transform: PhotoTransform,
    changes: Partial<Pick<PhotoTransform, "zoom" | "rotation">>,
    image: ImageSize,
    viewport: number,
): PhotoTransform {
    const next = { ...transform, ...changes };
    const scaleRatio = displayScale(image, viewport, next) / displayScale(image, viewport, transform);
    const offset = rotate(transform.offsetX * scaleRatio, transform.offsetY * scaleRatio, next.rotation - transform.rotation);
    return clampOffset({ ...next, offsetX: offset.x, offsetY: offset.y }, image, viewport);
}

/** Normalises an angle to (-180, 180]. */
export function normalizeRotation(degrees: number) {
    const wrapped = ((degrees % 360) + 360) % 360;
    return wrapped > 180 ? wrapped - 360 : wrapped;
}

/**
 * Renders exactly what the editor viewport shows into a square JPEG data URL.
 * Mirrors the CSS transform used by the preview: translate(offset) then rotate around the image centre.
 */
export function renderCroppedPhoto(img: HTMLImageElement, transform: PhotoTransform, viewport: number): string {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    const ratio = OUTPUT_SIZE / viewport;
    const image = { width: img.naturalWidth, height: img.naturalHeight };
    const scale = displayScale(image, viewport, transform) * ratio;
    const width = image.width * scale;
    const height = image.height * scale;

    // JPEG has no alpha: flatten transparent PNG/WebP onto white, like the resume page.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(OUTPUT_SIZE / 2 + transform.offsetX * ratio, OUTPUT_SIZE / 2 + transform.offsetY * ratio);
    ctx.rotate(toRadians(transform.rotation));
    ctx.drawImage(img, -width / 2, -height / 2, width, height);

    return canvas.toDataURL("image/jpeg", OUTPUT_QUALITY);
}
