import jsQR from "jsqr";
import sharp, {} from "sharp";
export const MAX_RECEIPT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_RECEIPT_IMAGE_MIMES = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
]);
const ALLOWED_SHARP_FORMATS = new Set(["png", "jpeg"]);
const decodeQrFn = (jsQR.default ??
    jsQR);
async function decodePipeline(pipeline) {
    const { data, info } = await pipeline
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height || info.channels !== 4) {
        return null;
    }
    const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
    const decoded = decodeQrFn(rgba, info.width, info.height, {
        inversionAttempts: "attemptBoth",
    });
    const trimmed = decoded?.data?.trim();
    return trimmed ? trimmed : null;
}
export async function extractQrContentFromImage(buffer, mimetype) {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
        return {
            ok: false,
            message: "Uploaded receipt image is empty.",
        };
    }
    if (buffer.length > MAX_RECEIPT_IMAGE_BYTES) {
        return {
            ok: false,
            message: "Uploaded receipt image exceeds the 5MB size limit.",
        };
    }
    if (mimetype && !ALLOWED_RECEIPT_IMAGE_MIMES.has(mimetype.toLowerCase())) {
        return {
            ok: false,
            message: "Unsupported image format. Please upload a PNG, JPG, or JPEG receipt image.",
        };
    }
    let metadata;
    try {
        metadata = await sharp(buffer).metadata();
    }
    catch {
        return {
            ok: false,
            message: "Invalid or corrupted receipt image file.",
        };
    }
    if (!metadata.format || !ALLOWED_SHARP_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) {
        return {
            ok: false,
            message: "Unsupported or corrupted image file. Only PNG, JPG, and JPEG images are accepted.",
        };
    }
    try {
        // Pass 1: Auto-rotated native resolution (works for crisp direct QR images & receipts)
        const direct = await decodePipeline(sharp(buffer).rotate());
        if (direct) {
            return { ok: true, content: direct };
        }
        // Pass 2: High-contrast normalized grayscale pass (helps on low-contrast/compressed receipts)
        const thresholded = await decodePipeline(sharp(buffer).rotate().greyscale().normalise().threshold(128));
        if (thresholded) {
            return { ok: true, content: thresholded };
        }
        // Pass 3: Resized pass (downscales huge screenshots or upscales small QR crops)
        const maxDim = Math.max(metadata.width, metadata.height);
        const targetWidth = maxDim > 1400 ? 1000 : maxDim < 400 ? metadata.width * 2 : undefined;
        if (targetWidth) {
            const resized = await decodePipeline(sharp(buffer).rotate().resize({ width: targetWidth, kernel: "lanczos3" }));
            if (resized) {
                return { ok: true, content: resized };
            }
            const resizedThreshold = await decodePipeline(sharp(buffer)
                .rotate()
                .resize({ width: targetWidth, kernel: "lanczos3" })
                .greyscale()
                .normalise()
                .threshold(128));
            if (resizedThreshold) {
                return { ok: true, content: resizedThreshold };
            }
        }
        return {
            ok: false,
            message: "No QR code detected in the uploaded receipt image. Please upload a clearer receipt image or provide transaction_id directly.",
        };
    }
    catch {
        return {
            ok: false,
            message: "Failed to decode QR code from the uploaded receipt image.",
        };
    }
}
//# sourceMappingURL=qr-extractor.js.map