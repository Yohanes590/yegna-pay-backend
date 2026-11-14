import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { uploadReceiptImageToCloudinary } from "../lib/cloudinary.js";
import { compressReceiptImageForUpload } from "../src/utils/image-compressor.js";
export const QR_RECEIPT_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "qr-receipts");
function mimeToExt(mime) {
    const lower = (mime || "").toLowerCase();
    if (lower === "image/jpeg" || lower === "image/jpg")
        return "jpg";
    return "png";
}
export async function persistQrReceiptImageAttempt(params) {
    const { file, projectId, status, bankName, extractedTransactionId = null, qrContent = null, transactionAmount = null, currency = "ETB", receiptDate = null, failureReason = null, verifiedAt = null, } = params;
    const recordId = crypto.randomUUID();
    let imageUrl = "";
    let cloudinaryPublicId = null;
    let localFilePath = null;
    // Compress image into a new buffer before uploading (never mutating file.buffer)
    const compressed = await compressReceiptImageForUpload(file.buffer, file.mimetype, {
        expectedQrContent: qrContent,
    });
    const cloudUpload = await uploadReceiptImageToCloudinary(compressed.buffer, {
        bankCode: bankName || "BANK",
        transactionId: extractedTransactionId || recordId,
        projectId,
    });
    if (cloudUpload.ok) {
        imageUrl = cloudUpload.url;
        cloudinaryPublicId = cloudUpload.publicId;
    }
    else {
        // Fallback: preserve the compressed receipt image on disk and serve via access-controlled backend route
        console.warn("Cloudinary upload unavailable, preserving compressed QR image locally:", cloudUpload.error);
        fs.mkdirSync(QR_RECEIPT_UPLOAD_DIR, { recursive: true });
        const ext = mimeToExt(compressed.mimeType);
        const filename = `${recordId}.${ext}`;
        const absolutePath = path.join(QR_RECEIPT_UPLOAD_DIR, filename);
        fs.writeFileSync(absolutePath, compressed.buffer);
        localFilePath = filename;
        imageUrl = `/api/qr-images/file/${recordId}`;
    }
    const numericAmount = transactionAmount !== null &&
        transactionAmount !== undefined &&
        Number.isFinite(Number(transactionAmount))
        ? Number(transactionAmount)
        : null;
    const record = await prisma.qrReceiptImage.create({
        data: {
            id: recordId,
            projectId,
            imageUrl,
            cloudinaryPublicId,
            localFilePath,
            mimeType: compressed.mimeType || file.mimetype || "image/png",
            status,
            extractedTransactionId: extractedTransactionId || null,
            qrContent: qrContent || null,
            transactionAmount: numericAmount,
            currency: currency || "ETB",
            bankName: bankName || "UNKNOWN",
            receiptDate: receiptDate || null,
            failureReason: failureReason || null,
            verifiedAt: verifiedAt || null,
        },
    });
    return record;
}
//# sourceMappingURL=qr-image-service.js.map