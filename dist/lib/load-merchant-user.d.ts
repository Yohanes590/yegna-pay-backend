export type MerchantUserWithRelations = Awaited<ReturnType<typeof loadMerchantUserByEmail>>;
export declare function loadMerchantUserByEmail(email: string): Promise<({
    projects: {
        id: string;
        project_name: string;
        api_sec_key: string;
        call_back_url: string;
        project_description: string;
        user_Id: string;
        adminID: string | null;
        ProjectBalance: string;
        before_expires: string | null;
        receiver_name: string | null;
        detail_verification: boolean;
    }[];
    revenues: {
        id: string;
        payer_name: string;
        paid_requests: number;
        currency: string;
        time_stamp: Date;
        user_id: string;
        amount: import("@prisma/client-runtime-utils").Decimal | null;
        status: string;
        method: string;
    }[];
} & {
    email: string;
    id: string;
    password: string | null;
    avatar_url: string | null;
    full_name: string;
    Provider: string | null;
    account_status: string;
    payment_plan: string;
    verified: boolean;
    request_available: number;
    free_requests_remaining: number;
    free_requests_used: number;
    paid_requests_balance: number;
    paid_requests_used: number;
}) | null>;
//# sourceMappingURL=load-merchant-user.d.ts.map