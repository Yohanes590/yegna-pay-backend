export interface BOAReceiptData {
    transferredAmount?: string;
    receiverAccount?: string;
    receiverName?: string;
    transactionDate?: string;
    transactionType?: string;
    transactionReference?: string;
    narrative?: string;
}
export declare function BOAReadingPDF(transactionData: {
    transaction_id: string;
}): Promise<BOAReceiptData>;
//# sourceMappingURL=BOA-reader.d.ts.map