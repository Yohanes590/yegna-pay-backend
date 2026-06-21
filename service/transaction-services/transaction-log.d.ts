export declare function TransactionLogSaved(transactionData: any): Promise<{
    data: {
        id: string;
        event: string;
        message: string;
        transaction_status: string;
        transaction_bank: string;
        created_at: Date;
        transaction_id: string | null;
    };
    success: boolean;
    message: string;
} | {
    data: null;
    success: boolean;
    message: string;
}>;
//# sourceMappingURL=transaction-log.d.ts.map