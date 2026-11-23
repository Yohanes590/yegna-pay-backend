import "dotenv/config";
interface CBEReceiptData {
    payer: string;
    receiver: string;
    paymentDateTime: string;
    referenceNo: string;
    transferredAmount: string;
    totalAmountDebited: string;
}
export declare function CBEReadingPDF(transactionData: {
    platform: string;
    transaction_id: string;
    transaction_url?: string;
}): Promise<{
    success: boolean;
    extractedData: CBEReceiptData;
    isVerified: boolean;
    error?: never;
} | {
    success: boolean;
    error: string;
    extractedData?: never;
    isVerified?: never;
}>;
export {};
//# sourceMappingURL=CBE-Reader.d.ts.map