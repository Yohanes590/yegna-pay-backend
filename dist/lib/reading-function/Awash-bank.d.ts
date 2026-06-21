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
}
export declare function AwashbankReader(transactionData: {
    transaction_id: string;
}): Promise<AwashReceiptData>;
//# sourceMappingURL=Awash-bank.d.ts.map