import "dotenv/config";

const STATIC_ORIGINS = [
    "http://localhost:3000",
    "https://admin-yegna-pay.vercel.app",
    "https://yegna-pay.vercel.app",
    "https://yegnapay.com",
    "https://www.yegnapay.com",
];

function parseEnvOrigins(): string[] {
    const fromClient = (process.env.CLIENT_URL || "")
        .split(",")
        .map((u) => u.trim().replace(/\/+$/, ""))
        .filter(Boolean);
    const extra = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || process.env.CORS_EXTRA_ORIGINS || "")
        .split(",")
        .map((u) => u.trim().replace(/\/+$/, ""))
        .filter(Boolean);
    return [...fromClient, ...extra];
}

export function getTrustedOrigins(): string[] {
    return Array.from(new Set([...parseEnvOrigins(), ...STATIC_ORIGINS, "https://*.vercel.app"]));
}

function hostnameAllowed(hostname: string): boolean {
    const host = hostname.toLowerCase();
    if (host === "localhost") return true;
    if (host.endsWith(".vercel.app") || host === "vercel.app") return true;
    if (host.endsWith(".yonas.cloud") || host === "yonas.cloud") return true;
    if (host === "yegnapay.com" || host.endsWith(".yegnapay.com")) return true;
    return false;
}

export function isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    const trusted = getTrustedOrigins();
    if (trusted.includes(origin)) return true;
    try {
        const { hostname, protocol } = new URL(origin);
        if (protocol !== "http:" && protocol !== "https:") return false;
        return hostnameAllowed(hostname);
    } catch {
        return false;
    }
}

export function getPrimaryClientUrl(): string {
    const urls = parseEnvOrigins();
    return urls[0] || "http://localhost:3000";
}