import { fromNodeHeaders } from "better-auth/node";
import { VerifyToken } from "./JWT-generate.js";
import { prisma } from "./prisma.js";
import { auth } from "./auth.js";
function extractClientToken(req) {
    const bodyToken = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const authHeader = req.headers.authorization;
    const bearer = authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : "";
    const bodyUserToken = typeof req.body?.user_token === "string" ? req.body.user_token.trim() : "";
    return bodyToken || bodyUserToken || bearer;
}
async function usersIdFromEmail(email) {
    const appUser = await prisma.users.findUnique({
        where: { email },
        select: { id: true },
    });
    return appUser?.id ?? null;
}
async function usersIdFromJwtPayload(payload) {
    if (payload.id) {
        const byId = await prisma.users.findUnique({
            where: { id: payload.id },
            select: { id: true },
        });
        if (byId?.id)
            return byId.id;
    }
    if (payload.email) {
        return usersIdFromEmail(payload.email);
    }
    return null;
}
/**
 * Resolves the app Users.id for dashboard routes (cross-domain JWT + Better Auth session).
 */
export async function resolveAuthenticatedUserId(req) {
    const clientToken = extractClientToken(req);
    if (clientToken) {
        const decode = VerifyToken(clientToken);
        if (decode.status === 200 && decode.message) {
            const fromJwt = await usersIdFromJwtPayload(decode.message);
            if (fromJwt)
                return fromJwt;
        }
        try {
            const dbSession = await prisma.session.findUnique({
                where: { token: clientToken },
                include: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date() && dbSession.user?.email) {
                const fromSession = await usersIdFromEmail(dbSession.user.email);
                if (fromSession)
                    return fromSession;
            }
        }
        catch {
            // continue to cookie session
        }
    }
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });
        if (session?.user?.email) {
            const fromCookieSession = await usersIdFromEmail(session.user.email);
            if (fromCookieSession)
                return fromCookieSession;
        }
    }
    catch {
        // no cookie session
    }
    return null;
}
//# sourceMappingURL=resolve-session-user.js.map