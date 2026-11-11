export declare function UserRequestAmount(userId: string): Promise<{
    message: string;
    success: boolean;
    free_remaining?: never;
    paid_balance?: never;
} | {
    message: string;
    success: boolean;
    free_remaining: number;
    paid_balance: number;
}>;
export declare function deductUserRequestCredit(userId: string): Promise<{
    success: boolean;
    type?: "free" | "paid";
    message?: string;
}>;
//# sourceMappingURL=request-checker.d.ts.map