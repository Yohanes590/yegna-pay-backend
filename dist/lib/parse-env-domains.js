/**
 * Parse one or more bank receipt base URLs from an env value.
 * Supports comma- or semicolon-separated lists, e.g.:
 * CBE_DOMAIN="https://apps.cbe.com.et/, https://Mbreciept.cbe.com.et/"
 */
export function parseDomainEnvValue(raw, label) {
    const trimmed = (raw || "").trim();
    if (!trimmed) {
        throw new Error(`${label} is not configured in environment variables.`);
    }
    const parts = trimmed
        .split(/[,;]/)
        .map((part) => part.trim())
        .filter(Boolean);
    const urls = [];
    for (const part of parts) {
        try {
            const parsed = new URL(part);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                throw new Error(`Invalid protocol: ${parsed.protocol}`);
            }
            urls.push(parsed);
        }
        catch (err) {
            const detail = err instanceof Error ? err.message : "";
            throw new Error(`Invalid ${label} entry "${part}". ${detail}`.trim());
        }
    }
    if (!urls.length) {
        throw new Error(`${label} is not configured in environment variables.`);
    }
    return urls;
}
export function getEnvDomainUrls(envVarName, fallbackUrl) {
    const raw = process.env[envVarName] || fallbackUrl;
    return parseDomainEnvValue(raw, envVarName);
}
export function matchUrlAgainstAllowedBases(parsedInput, allowed) {
    const host = parsedInput.hostname.toLowerCase();
    for (const base of allowed) {
        if (base.hostname.toLowerCase() !== host) {
            continue;
        }
        if (parsedInput.protocol !== base.protocol) {
            continue;
        }
        if (base.port && parsedInput.port && parsedInput.port !== base.port) {
            continue;
        }
        return base;
    }
    return null;
}
export function formatAllowedHostnames(domains) {
    return domains.map((d) => d.hostname).join(", ");
}
//# sourceMappingURL=parse-env-domains.js.map