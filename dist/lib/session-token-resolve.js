import { prisma } from "./prisma.js";
/** Resolve Better Auth DB session from client token (raw or signed cookie value). */
export async function resolveUserFromSessionToken(clientToken) {
    const trimmed = clientToken.trim();
    if (!trimmed)
        return null;
    const variants = new Set([trimmed]);
    const dot = trimmed.indexOf(".");
    if (dot > 0)
        variants.add(trimmed.slice(0, dot));
    for (const token of variants) {
        const dbSession = await prisma.session.findUnique({
            where: { token },
            include: { user: true },
        });
        if (dbSession && dbSession.expiresAt > new Date() && dbSession.user?.email) {
            return {
                email: dbSession.user.email,
                authUserId: dbSession.user.id,
            };
        }
    }
    return null;
}
//# sourceMappingURL=session-token-resolve.js.map