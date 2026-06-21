export declare function CBECheckFunction(CBEData: any, shouldSave?: boolean): Promise<{
    message: string;
    error: string;
    success: boolean;
    data: null;
    vs?: never;
} | {
    message: string;
    success: boolean;
    data: null;
    vs: string;
    error?: never;
} | {
    message: any;
    success: boolean;
    data: null;
    error?: never;
    vs?: never;
} | {
    message: string;
    success: boolean;
    data: {
        transaction_id: any;
        transaction_amount: number;
        created_at: number;
        method: string;
        status: string;
        from: any;
        to: any;
        currency: string;
        risk_score: number;
    };
    error?: never;
    vs?: never;
}>;
//# sourceMappingURL=CBE-check.d.ts.map