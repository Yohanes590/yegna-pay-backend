import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
const rawClientUrls = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);
const githubClientId = process.env.GITHUB_CLIENT_ID?.trim() || "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() || "";
const hasGithub = Boolean(githubClientId &&
    githubClientSecret &&
    githubClientId !== "github_client_id_placeholder");
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    secret: process.env.BETTER_AUTH_SECRET || process.env.SECRETE_KEY || "yegna-pay-auth-secret-key-production-32char",
    baseURL: (process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 4000}`).trim().replace(/\/+$/, ""),
    trustedOrigins: Array.from(new Set([
        ...rawClientUrls,
        "http://localhost:3000",
        "https://admin-yegna-pay.vercel.app",
    ])),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
            enabled: hasGithub,
        },
    },
});
//# sourceMappingURL=auth.js.map