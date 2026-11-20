import { prisma } from "./prisma.js";
const GENERIC_NAMES = new Set(["merchant", "yegna developer", "github user", "user", ""]);
export function isGenericDisplayName(name) {
    const normalized = (name || "").trim().toLowerCase();
    return !normalized || GENERIC_NAMES.has(normalized);
}
export async function resolveGithubUsername(authUserId) {
    const account = await prisma.account.findFirst({
        where: { userId: authUserId, providerId: "github" },
        select: { accountId: true },
    });
    const accountId = account?.accountId?.trim();
    if (!accountId)
        return null;
    if (/^\d+$/.test(accountId))
        return null;
    return accountId.replace(/^@/, "");
}
export function githubAvatarUrl(login) {
    const handle = login.replace(/^@/, "").trim();
    return `https://avatars.githubusercontent.com/${encodeURIComponent(handle)}?v=4`;
}
export async function syncBetterAuthUserGithubProfile(authUserId) {
    const row = await prisma.user.findUnique({
        where: { id: authUserId },
        select: { id: true, name: true, image: true },
    });
    if (!row)
        return;
    const login = await resolveGithubUsername(authUserId);
    if (!login)
        return;
    const nextName = row.name?.trim() && !isGenericDisplayName(row.name) ? row.name : login;
    const nextImage = row.image?.trim() || githubAvatarUrl(login);
    if (nextName !== row.name || nextImage !== row.image) {
        await prisma.user.update({
            where: { id: authUserId },
            data: { name: nextName, image: nextImage },
        });
    }
}
export function inferGithubHandleFromName(name) {
    const trimmed = (name || "").trim();
    if (!trimmed || trimmed.includes(" ") || isGenericDisplayName(trimmed))
        return null;
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(trimmed))
        return null;
    return trimmed;
}
//# sourceMappingURL=oauth-profile.js.map