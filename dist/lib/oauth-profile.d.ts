export declare function isGenericDisplayName(name?: string | null): boolean;
export declare function resolveGithubUsername(authUserId: string): Promise<string | null>;
export declare function githubAvatarUrl(login: string): string;
export declare function syncBetterAuthUserGithubProfile(authUserId: string): Promise<void>;
export declare function inferGithubHandleFromName(name?: string | null): string | null;
//# sourceMappingURL=oauth-profile.d.ts.map