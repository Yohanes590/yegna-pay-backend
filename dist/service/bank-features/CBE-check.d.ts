export declare function CBECheckFunction(CBEData: any, shouldSave?: boolean): Promise<{
    status: string;
    message: string;
    error: string;
    success: boolean;
    data: null;
    vs?: never;
} | {
    status: string;
    message: string;
    success: boolean;
    data: null;
    vs: string;
    error?: never;
} | {
    status: string;
    message: string;
    success: boolean;
    data: null;
    error?: never;
    vs?: never;
} | {
    message: any;
    success: boolean;
    data: null;
    status?: never;
    error?: never;
    vs?: never;
} | {
    status: string;
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