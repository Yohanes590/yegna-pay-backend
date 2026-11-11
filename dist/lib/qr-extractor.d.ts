export declare const MAX_RECEIPT_IMAGE_BYTES: number;
export declare const ALLOWED_RECEIPT_IMAGE_MIMES: Set<string>;
export type QrExtractionResult = {
    ok: true;
    content: string;
} | {
    ok: false;
    message: string;
};
export declare function extractQrContentFromImage(buffer: Buffer | undefined | null, mimetype?: string): Promise<QrExtractionResult>;
//# sourceMappingURL=qr-extractor.d.ts.map