import "dotenv/config";
export interface BillingConfig {
    costPerRequest: number;
    freeRequests: number;
    accountUserName: string;
    billingMethod: string;
    accountNumber: string;
    beforeDate: string;
    currency: string;
}
export declare function getBillingConfig(): BillingConfig;
//# sourceMappingURL=billing-config.d.ts.map