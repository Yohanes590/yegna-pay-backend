import type { Request } from "express";
/**
 * Resolves the app Users.id for dashboard routes (cross-domain JWT + Better Auth session).
 */
export declare function resolveAuthenticatedUserId(req: Request): Promise<string | null>;
//# sourceMappingURL=resolve-session-user.d.ts.map