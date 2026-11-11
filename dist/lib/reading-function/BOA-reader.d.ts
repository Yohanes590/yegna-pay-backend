export interface BOAReceiptData {
    transferredAmount?: string;
    receiverAccount?: string;
    receiverName?: string;
    senderName?: string;
    transactionDate?: string;
    transactionType?: string;
    transactionReference?: string;
    narrative?: string;
}
export declare function BOAReadingPDF(transactionData: {
    transaction_id: string;
    transaction_url?: string;
}): Promise<BOAReceiptData>;
//# sourceMappingURL=BOA-reader.d.ts.map