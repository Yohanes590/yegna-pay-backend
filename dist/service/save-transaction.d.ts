export interface SaveTransactionResult {
    message: string;
    success: boolean;
    isDuplicate?: boolean;
    isDatabaseError?: boolean;
    errorKey?: string;
}
export declare function SaveTransactionData(transactionData: any, projectID: string): Promise<SaveTransactionResult>;
//# sourceMappingURL=save-transaction.d.ts.map