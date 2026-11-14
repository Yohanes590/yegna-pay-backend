type TransactionInput = {
    user_amount: string;
    receipt_amount: string;
    payer: string;
    user_name: string;
    transactionID: string;
    projectId: string;
    project_name: string;
    receiver: string;
    method?: string;
};
export declare function CheckingFunction(userData: TransactionInput): Promise<{
    status: number;
    message: string;
    userInfo?: never;
    data?: never;
    riskScore?: never;
} | {
    status: number;
    message: string;
    userInfo: TransactionInput;
    data?: never;
    riskScore?: never;
} | {
    status: number;
    message: string;
    data: {
        id: string;
        projectId: string;
        from: string;
        to: string;
        method: string;
        transaction_id: string;
        transaction_status: string;
        created_at: Date;
        transaction_amount: import("@prisma/client-runtime-utils").Decimal;
        currency: string;
        risk_score: number;
    };
    riskScore: number;
    userInfo?: never;
}>;
export {};
//# sourceMappingURL=checking-function.d.ts.map