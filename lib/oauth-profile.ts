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

export function githubAvatarUrl(login: string): string {
    const handle = login.replace(/^@/, "").trim();
    return `https://avatars.githubusercontent.com/${encodeURIComponent(handle)}?v=4`;
}

export async function syncBetterAuthUserGithubProfile(authUserId: string): Promise<void> {
    const row = await prisma.user.findUnique({
        where: { id: authUserId },
        select: { id: true, name: true, image: true },
    });
    if (!row) return;

    const login = await resolveGithubUsername(authUserId);
    if (!login) return;

    const nextName = row.name?.trim() && !isGenericDisplayName(row.name) ? row.name : login;
    const nextImage = row.image?.trim() || githubAvatarUrl(login);

    if (nextName !== row.name || nextImage !== row.image) {
        await prisma.user.update({
            where: { id: authUserId },
            data: { name: nextName, image: nextImage },
        });
    }
}

export function inferGithubHandleFromName(name?: string | null): string | null {
    const trimmed = (name || "").trim();
    if (!trimmed || trimmed.includes(" ") || isGenericDisplayName(trimmed)) return null;
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(trimmed)) return null;
    return trimmed;
}