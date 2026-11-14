import sharp from "sharp";
import { ALLOWED_RECEIPT_IMAGE_MIMES, MAX_RECEIPT_IMAGE_BYTES, extractQrContentFromImage, } from "../../lib/qr-extractor.js";
import { AppError } from "./app-error.js";
const MAX_DIMENSION_PX = 1600;
/**
 * Compresses an uploaded receipt image into a new Buffer without mutating the input.
 * Preserves sufficient resolution and chroma fidelity for QR code decoding.
 */
export async function compressReceiptImageForUpload(inputBuffer, mimetype, options) {
    if (!inputBuffer || !Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
        throw new AppError("INVALID_RECEIPT_IMAGE", {
            message: "Uploaded receipt image is empty.",
        });
    }
    if (inputBuffer.length > MAX_RECEIPT_IMAGE_BYTES) {
        throw new AppError("INVALID_RECEIPT_IMAGE", {
            message: "Uploaded receipt image exceeds the 5MB size limit.",
        });
    }
    if (mimetype && !ALLOWED_RECEIPT_IMAGE_MIMES.has(mimetype.toLowerCase())) {
        throw new AppError("INVALID_RECEIPT_IMAGE", {
            message: "Unsupported image format. Please upload a PNG, JPG, or JPEG receipt image.",
        });
    }
    try {
        // Read metadata from a fresh Sharp pipeline (never modifies inputBuffer)
        const metadata = await sharp(inputBuffer).metadata();
        if (!metadata.format ||
            (metadata.format !== "png" && metadata.format !== "jpeg") ||
            !metadata.width ||
            !metadata.height) {
            throw new AppError("INVALID_RECEIPT_IMAGE", {
                message: "Unsupported or corrupted image file. Only PNG, JPG, and JPEG images are accepted.",
            });
        }
        const targetFormat = metadata.format === "png" ? "png" : "jpeg";
        const targetMime = targetFormat === "png" ? "image/png" : "image/jpeg";
        const basePipeline = sharp(inputBuffer)
            .rotate()
            .resize({
            width: MAX_DIMENSION_PX,
            height: MAX_DIMENSION_PX,
            fit: "inside",
            withoutEnlargement: true,
            kernel: "lanczos3",
        });
        let compressedBuffer = targetFormat === "png"
            ? await basePipeline
                .png({
                compressionLevel: 9,
                palette: true,
                quality: 90,
                effort: 7,
            })
                .toBuffer()
            : await basePipeline
                .jpeg({
                quality: 82,
                mozjpeg: true,
                chromaSubsampling: "4:4:4",
            })
                .toBuffer();
        // Check if QR readability is preserved when the receipt contains a QR code
        let qrPreserved = true;
        const expectedQr = options?.expectedQrContent?.trim();
        if (expectedQr) {
            const compressedQrCheck = await extractQrContentFromImage(compressedBuffer, targetMime);
            if (!compressedQrCheck.ok || compressedQrCheck.content.trim() !== expectedQr) {
                // Retry with lossless PNG at native resolution (capped only if huge)
                const losslessBuffer = await sharp(inputBuffer)
                    .rotate()
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                const losslessCheck = await extractQrContentFromImage(losslessBuffer, "image/png");
                if (losslessCheck.ok && losslessCheck.content.trim() === expectedQr) {
                    compressedBuffer = losslessBuffer;
                    const losslessMeta = await sharp(compressedBuffer).metadata();
                    return {
                        buffer: compressedBuffer,
                        mimeType: "image/png",
                        format: "png",
                        originalBytes: inputBuffer.length,
                        compressedBytes: compressedBuffer.length,
                        width: losslessMeta.width || metadata.width,
                        height: losslessMeta.height || metadata.height,
                        qrPreserved: true,
                    };
                }
                // Final safety fallback: preserve original buffer bytes if re-encoding altered QR
                compressedBuffer = Buffer.from(inputBuffer);
                qrPreserved = true;
            }
        }
        // If compression did not shrink an already-small image and lossless/original is valid, keep smaller
        if (compressedBuffer.length > inputBuffer.length && !expectedQr) {
            compressedBuffer = Buffer.from(inputBuffer);
        }
        const finalMeta = await sharp(compressedBuffer).metadata();
        return {
            buffer: compressedBuffer,
            mimeType: finalMeta.format === "png" ? "image/png" : targetMime,
            format: finalMeta.format === "png" ? "png" : targetFormat,
            originalBytes: inputBuffer.length,
            compressedBytes: compressedBuffer.length,
            width: finalMeta.width || metadata.width,
            height: finalMeta.height || metadata.height,
            qrPreserved,
        };
    }
    catch (err) {
        if (err instanceof AppError) {
            throw err;
        }
        throw new AppError("IMAGE_PROCESSING_ERROR", { cause: err });
    }
}
//# sourceMappingURL=image-compressor.js.map