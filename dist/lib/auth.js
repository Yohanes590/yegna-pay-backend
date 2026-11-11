import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const hasGithub = Boolean(process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET &&
    process.env.GITHUB_CLIENT_ID !== "github_client_id_placeholder");
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    secret: process.env.BETTER_AUTH_SECRET || process.env.SECRETE_KEY || "yegna-pay-auth-secret-key-production-32char",
    baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 4000}`,
    trustedOrigins: [
        clientUrl,
        "http://localhost:3000",
        "https://admin-yegna-pay.vercel.app",
    ],
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            enabled: hasGithub,
        },
    },
});
//# sourceMappingURL=auth.js.map