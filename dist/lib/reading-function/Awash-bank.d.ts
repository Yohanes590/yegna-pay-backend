export interface AwashReceiptData {
    transferredAmount?: string;
    receiverAccount?: string;
    receiverName?: string;
    transactionDate?: string;
    transactionType?: string;
    transactionReference?: string;
    narrative?: string;
    vat?: string;
    senderName?: string;
    beneficiaryBank?: string;
    status?: string;
}
export declare function parseAwashReceipt(htmlContent: string): AwashReceiptData;
export declare function AwashbankReader(transactionData: {
    transaction_id: string;
    transaction_url?: string;
}): Promise<AwashReceiptData>;
//# sourceMappingURL=Awash-bank.d.ts.map