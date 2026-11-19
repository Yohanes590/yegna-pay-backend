/**
 * Ensures outbound bank fetches only target the configured bank hostname (SSRF mitigation).
 */
export declare function assertSafeBankFetchUrl(requestUrl: string, allowedHostname: string): Promise<URL>;
//# sourceMappingURL=ssrf-guard.d.ts.map