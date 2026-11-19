import { prisma } from "./prisma.js";

const GENERIC_NAMES = new Set(["merchant", "yegna developer", "github user", "user", ""]);

export function isGenericDisplayName(name?: string | null): boolean {
    const normalized = (name || "").trim().toLowerCase();
    return !normalized || GENERIC_NAMES.has(normalized);
}

export async function resolveGithubUsername(authUserId: string): Promise<string | null> {
    const account = await prisma.account.findFirst({
        where: { userId: authUserId, providerId: "github" },
        select: { accountId: true },
    });
    const accountId = account?.accountId?.trim();
    if (!accountId) return null;
    if (/^\d+$/.test(accountId)) return null;
    return accountId.replace(/^@/, "");
}

export function inferGithubHandleFromName(name?: string | null): string | null {
    const trimmed = (name || "").trim();
    if (!trimmed || trimmed.includes(" ") || isGenericDisplayName(trimmed)) return null;
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(trimmed)) return null;
    return trimmed;
}