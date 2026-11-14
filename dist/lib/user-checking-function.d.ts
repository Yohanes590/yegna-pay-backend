export declare const UserCheckFunction: (userEmail: string) => Promise<{
    status: number;
    message: string;
    user: {
        email: string;
        id: string;
        password: string | null;
        full_name: string;
        avatar_url: string | null;
        Provider: string | null;
        account_status: string;
        payment_plan: string;
        verified: boolean;
        request_available: number;
        free_requests_remaining: number;
        free_requests_used: number;
        paid_requests_balance: number;
        paid_requests_used: number;
    };
} | {
    status: number;
    message: string;
    user?: never;
}>;
//# sourceMappingURL=user-checking-function.d.ts.map