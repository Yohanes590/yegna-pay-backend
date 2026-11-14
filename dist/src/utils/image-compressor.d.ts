export interface CompressedReceiptImage {
    buffer: Buffer;
    mimeType: "image/png" | "image/jpeg";
    format: "png" | "jpeg";
    originalBytes: number;
    compressedBytes: number;
    width: number;
    height: number;
    qrPreserved: boolean;
}
/**
 * Compresses an uploaded receipt image into a new Buffer without mutating the input.
 * Preserves sufficient resolution and chroma fidelity for QR code decoding.
 */
export declare function compressReceiptImageForUpload(inputBuffer: Buffer, mimetype?: string, options?: {
    expectedQrContent?: string | null | undefined;
}): Promise<CompressedReceiptImage>;
//# sourceMappingURL=image-compressor.d.ts.map