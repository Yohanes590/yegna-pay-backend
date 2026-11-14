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
    id: string;
    createdAt: Date;
    projectId: string;
    currency: string;
    status: string;
    mimeType: string;
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
}>;
//# sourceMappingURL=qr-image-service.d.ts.map