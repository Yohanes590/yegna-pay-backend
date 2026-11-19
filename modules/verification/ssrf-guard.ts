import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateIpv4(ip: string): boolean {
    const parts = ip.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    return false;
}

function isBlockedIp(ip: string): boolean {
    const kind = net.isIP(ip);
    if (kind === 4) return isPrivateIpv4(ip);
    if (kind === 6) {
        const normalized = ip.toLowerCase();
        return (
            normalized === "::1" ||
            normalized.startsWith("fc") ||
            normalized.startsWith("fd") ||
            normalized.startsWith("fe80")
        );
    }
    return false;
}

/**
 * Ensures outbound bank fetches only target the configured bank hostname (SSRF mitigation).
 */
export async function assertSafeBankFetchUrl(requestUrl: string, allowedHostname: string): Promise<URL> {
    let parsed: URL;
    try {
        parsed = new URL(requestUrl.trim());
    } catch {
        throw new Error("Invalid transaction URL format.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http(s) transaction URLs are allowed.");
    }

    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".local")) {
        throw new Error("Transaction URL host is not allowed.");
    }

    if (host !== allowedHostname.toLowerCase()) {
        throw new Error(`Transaction URL must use host "${allowedHostname}".`);
    }

    // Resolve host and reject private targets (DNS rebinding / misconfigured env)
    const resolved = await dns.lookup(host, { verbatim: true });
    if (isBlockedIp(resolved.address)) {
        throw new Error("Transaction URL resolves to a private network address.");
    }

    return parsed;
}