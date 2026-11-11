export declare const QR_RECEIPT_UPLOAD_DIR: string;
export interface PersistQrReceiptImageParams {
    file: Express.Multer.File;
    projectId: string;
    status: "VERIFIED" | "FAILED";
    bankName: string;
    extractedTransactionId?: string | null | undefined;
    qrContent?: string | null | undefined;
    transactionAmount?: number | null | undefined;
    currency?: string | undefined;
    receiptDate?: string | null | undefined;
    failureReason?: string | null | undefined;
    verifiedAt?: Date | null | undefined;
}
export declare function persistQrReceiptImageAttempt(params: PersistQrReceiptImageParams): Promise<{
    projectId: string;
    id: string;
    createdAt: Date;
    currency: string;
    status: string;
    bankName: string;
    extractedTransactionId: string | null;
    qrContent: string | null;
    transactionAmount: import("@prisma/client-runtime-utils").Decimal | null;
    receiptDate: string | null;
    failureReason: string | null;
    verifiedAt: Date | null;
    imageUrl: string;
    cloudinaryPublicId: string | null;
    localFilePath: string | null;
    mimeType: string;
}>;
//# sourceMappingURL=qr-image-service.d.ts.map