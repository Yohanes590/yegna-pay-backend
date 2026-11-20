export type SessionUserRef = {
    email: string;
    authUserId: string;
};
/** Resolve Better Auth DB session from client token (raw or signed cookie value). */
export declare function resolveUserFromSessionToken(clientToken: string): Promise<SessionUserRef | null>;
//# sourceMappingURL=session-token-resolve.d.ts.map