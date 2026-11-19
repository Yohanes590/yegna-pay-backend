import "dotenv/config";
import { extractCleanTransactionId } from "../../lib/cbe-domain.js";
export function getDomainFromEnv(envVarName, fallbackUrl) {
    const raw = process.env[envVarName] || fallbackUrl;
    try {
        const parsed = new URL(raw.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error(`Invalid protocol for ${envVarName}: ${parsed.protocol}`);
        }
        return parsed;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "";
        throw new Error(`Invalid ${envVarName} configuration: "${raw}". ${message}`.trim());
    }
}
export function validateBankDomain(envVarName, bankLabel, fallbackUrl, inputUrlStr) {
    if (!inputUrlStr || typeof inputUrlStr !== "string" || inputUrlStr.trim() === "") {
        throw new Error("Transaction URL cannot be empty.");
    }
    const baseDomain = getDomainFromEnv(envVarName, fallbackUrl);
    let parsedInput;
    try {
        parsedInput = new URL(inputUrlStr.trim());
    }
    catch {
        throw new Error(`Invalid ${bankLabel} transaction URL format. Must be a valid absolute URL.`);
    }
    if (parsedInput.protocol !== baseDomain.protocol) {
        throw new Error(`Invalid ${bankLabel} protocol: "${parsedInput.protocol}". Expected "${baseDomain.protocol}".`);
    }
    if (parsedInput.hostname.toLowerCase() !== baseDomain.hostname.toLowerCase()) {
        throw new Error(`Invalid ${bankLabel} domain: "${parsedInput.hostname}". Expected "${baseDomain.hostname}".`);
    }
    if (baseDomain.port && parsedInput.port && parsedInput.port !== baseDomain.port) {
        throw new Error(`Invalid port for ${bankLabel}: "${parsedInput.port}". Expected port "${baseDomain.port}".`);
    }
    const basePath = baseDomain.pathname.endsWith("/") ? baseDomain.pathname : `${baseDomain.pathname}/`;
    let relativePath = parsedInput.pathname;
    if (relativePath.startsWith(basePath)) {
        relativePath = relativePath.slice(basePath.length);
    }
    else if (relativePath.startsWith(baseDomain.pathname)) {
        relativePath = relativePath.slice(baseDomain.pathname.length);
    }
    else if (relativePath.startsWith("/")) {
        relativePath = relativePath.slice(1);
    }
    const extractedPath = (relativePath || "") + parsedInput.search + parsedInput.hash;
    return {
        extractedPath,
        fullUrl: parsedInput.toString(),
    };
}
export function buildBankReceiptUrl(baseDomain, transaction_id, transaction_url) {
    if (transaction_url && (transaction_url.startsWith("http://") || transaction_url.startsWith("https://"))) {
        return transaction_url;
    }
    if (transaction_id.startsWith("http://") || transaction_id.startsWith("https://")) {
        return transaction_id;
    }
    const normalized = baseDomain.toString().endsWith("/") ? baseDomain.toString() : `${baseDomain.toString()}/`;
    if (transaction_id.startsWith("?") || transaction_id.startsWith("#") || transaction_id.startsWith("/")) {
        return `${normalized}${transaction_id.replace(/^\//, "")}`;
    }
    return `${normalized}?id=${transaction_id}`;
}
export { extractCleanTransactionId };
//# sourceMappingURL=domain.js.map