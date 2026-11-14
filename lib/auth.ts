import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

const rawClientUrls = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const clientUrl = rawClientUrls[0] || "http://localhost:3000";
const githubClientId = process.env.GITHUB_CLIENT_ID?.trim() || "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() || "";

const hasGithub = Boolean(
    githubClientId &&
    githubClientSecret &&
    githubClientId !== "github_client_id_placeholder"
);

const baseURL = (process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 4000}`).trim().replace(/\/+$/, "");
const isProduction = process.env.NODE_ENV === "production" || baseURL.startsWith("https://");
const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || (baseURL.includes(".yonas.cloud") ? ".yonas.cloud" : undefined);

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    secret: process.env.BETTER_AUTH_SECRET || process.env.SECRETE_KEY || "yegna-pay-auth-secret-key-production-32char",
    baseURL,
    trustedOrigins: Array.from(
        new Set([
            ...rawClientUrls,
            "http://localhost:3000",
            "https://admin-yegna-pay.vercel.app",
        ])
    ),
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
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["github", "google"],
        },
        skipStateCookieCheck: true,
    } as any,
    advanced: {
        useSecureCookies: isProduction,
        ...(cookieDomain
            ? {
                crossSubDomainCookies: {
                    enabled: true,
                    domain: cookieDomain,
                },
            }
            : {}),
        defaultCookieAttributes: {
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction,
            partitioned: isProduction,
        },
    },
    onAPIError: {
        errorURL: `${clientUrl}/sign-in`,
    },
});
