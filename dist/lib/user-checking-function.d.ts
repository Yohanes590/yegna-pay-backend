export declare const UserCheckFunction: (userEmail: string) => Promise<{
    status: number;
    message: string;
    user: {
        id: string;
        full_name: string;
        email: string;
        password: string | null;
        avatar_url: string | null;
        Provider: string | null;
        account_status: string;
        payment_plan: string;
        verified: boolean;
        request_available: number;
    };
} | {
    status: number;
    message: string;
    user?: never;
}>;
//# sourceMappingURL=user-checking-function.d.ts.map