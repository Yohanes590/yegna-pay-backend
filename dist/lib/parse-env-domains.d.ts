/**
 * Parse one or more bank receipt base URLs from an env value.
 * Supports comma- or semicolon-separated lists, e.g.:
 * CBE_DOMAIN="https://apps.cbe.com.et/, https://Mbreciept.cbe.com.et/"
 */
export declare function parseDomainEnvValue(raw: string, label: string): URL[];
export declare function getEnvDomainUrls(envVarName: string, fallbackUrl: string): URL[];
export declare function matchUrlAgainstAllowedBases(parsedInput: URL, allowed: URL[]): URL | null;
export declare function formatAllowedHostnames(domains: URL[]): string;
//# sourceMappingURL=parse-env-domains.d.ts.map