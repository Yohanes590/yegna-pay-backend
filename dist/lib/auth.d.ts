import "dotenv/config";
export declare const auth: import("better-auth").Auth<{
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    secret: string;
    baseURL: string;
    trustedOrigins: string[];
    emailAndPassword: {
        enabled: true;
    };
    socialProviders: {
        github: {
            clientId: string;
            clientSecret: string;
            enabled: boolean;
        };
    };
    account: any;
    advanced: {
        defaultCookieAttributes: {
            sameSite: "none" | "lax";
            secure: boolean;
            partitioned: boolean;
        };
        crossSubDomainCookies?: {
            enabled: true;
            domain: string;
        };
        useSecureCookies: boolean;
    };
    onAPIError: {
        errorURL: string;
    };
}>;
//# sourceMappingURL=auth.d.ts.map