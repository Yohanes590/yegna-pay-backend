import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryEnvConfig {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
}

export function getCloudinaryConfig(): CloudinaryEnvConfig | null {
    const cloudName = (process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    const apiKey = (process.env.CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY || "").trim();
    const apiSecret = (
        process.env.CLOUD_API_SECRATE ||
        process.env.CLOUD_API_SECRET ||
        process.env.CLOUDINARY_API_SECRET ||
        ""
    ).trim();

    if (!cloudName || !apiKey || !apiSecret) {
        return null;
    }

    return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
    return getCloudinaryConfig() !== null;
}

export interface UploadReceiptImageOptions {
    bankCode: string;
    transactionId: string;
    projectId?: string;
    folder?: string;
}

export type UploadReceiptImageResult =
    | { ok: true; url: string; publicId: string }
    | { ok: false; error: string };

export async function uploadReceiptImageToCloudinary(
    buffer: Buffer,
    options: UploadReceiptImageOptions
): Promise<UploadReceiptImageResult> {
    const config = getCloudinaryConfig();
    if (!config) {
        return {
            ok: false,
            error: "Cloudinary credentials (CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRATE) are not configured.",
        };
    }

    if (!buffer || buffer.length === 0) {
        return { ok: false, error: "Cannot upload an empty receipt image buffer." };
    }

    cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        secure: true,
    });

    const safeBank = (options.bankCode || "BANK").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const safeTxId = (options.transactionId || "tx").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    const folder = options.folder || `yegna-pay/receipts/${safeBank}`;
    const publicId = `${safeTxId}_${Date.now()}`;

    return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                resource_type: "image",
                overwrite: false,
            },
            (error, result) => {
                if (error || !result?.secure_url) {
                    resolve({
                        ok: false,
                        error: error?.message || "Cloudinary upload failed without returning a URL.",
                    });
                    return;
                }
                resolve({
                    ok: true,
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        uploadStream.on("error", (streamErr: Error) => {
            resolve({
                ok: false,
                error: streamErr?.message || "Cloudinary upload stream error.",
            });
        });

        uploadStream.end(buffer);
    });
}

