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
}>;
//# sourceMappingURL=auth.d.ts.map