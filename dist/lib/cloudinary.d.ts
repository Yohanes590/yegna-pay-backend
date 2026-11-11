export interface CloudinaryEnvConfig {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
}
export declare function getCloudinaryConfig(): CloudinaryEnvConfig | null;
export declare function isCloudinaryConfigured(): boolean;
export interface UploadReceiptImageOptions {
    bankCode: string;
    transactionId: string;
    projectId?: string;
    folder?: string;
}
export type UploadReceiptImageResult = {
    ok: true;
    url: string;
    publicId: string;
} | {
    ok: false;
    error: string;
};
export declare function uploadReceiptImageToCloudinary(buffer: Buffer, options: UploadReceiptImageOptions): Promise<UploadReceiptImageResult>;
//# sourceMappingURL=cloudinary.d.ts.map