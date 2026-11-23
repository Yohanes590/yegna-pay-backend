import "dotenv/config";
import { formatAllowedHostnames, getEnvDomainUrls, matchUrlAgainstAllowedBases, } from "./parse-env-domains.js";
const CBE_DOMAIN_FALLBACK = "https://apps.cbe.com.et/";
/**
 * All configured CBE receipt base URLs (comma-separated in CBE_DOMAIN).
 */
export function getCBEDomains() {
    return getEnvDomainUrls("CBE_DOMAIN", CBE_DOMAIN_FALLBACK);
}
/** Primary CBE domain — used when synthesizing links from a bare transaction id. */
export function getCBEDomain() {
    return getCBEDomains()[0];
}
/**
 * Extracts only the transaction-specific portion that comes after the CBE domain.
 * Supports path, query parameters, and fragments.
 * Validates that the URL belongs to the expected CBE domain using the JavaScript URL API.
 */
export function extractCBETransactionPath(inputUrlStr) {
    if (!inputUrlStr || typeof inputUrlStr !== "string" || inputUrlStr.trim() === "") {
        throw new Error("Transaction URL cannot be empty.");
    }
    const allowedBases = getCBEDomains();
    let parsedInput;
    try {
        parsedInput = new URL(inputUrlStr.trim());
    }
    catch {
        throw new Error("Invalid transaction URL format. Must be a valid absolute URL.");
    }
    const cbeBase = matchUrlAgainstAllowedBases(parsedInput, allowedBases);
    if (!cbeBase) {
        throw new Error(`Invalid CBE domain: "${parsedInput.hostname}". Expected one of: ${formatAllowedHostnames(allowedBases)}.`);
    }
    // Extract everything following the configured CBE domain root
    const basePath = cbeBase.pathname.endsWith("/") ? cbeBase.pathname : `${cbeBase.pathname}/`;
    let relativePath = parsedInput.pathname;
    if (relativePath.startsWith(basePath)) {
        relativePath = relativePath.slice(basePath.length);
    }
    else if (relativePath.startsWith(cbeBase.pathname)) {
        relativePath = relativePath.slice(cbeBase.pathname.length);
    }
    else if (relativePath.startsWith("/")) {
        relativePath = relativePath.slice(1);
    }
    const extractedPath = (relativePath || "") + parsedInput.search + parsedInput.hash;
    if (!extractedPath || extractedPath.trim() === "") {
        throw new Error("Transaction URL must contain a valid transaction path, parameter, or fragment.");
    }
    return {
        extractedPath,
        fullUrl: parsedInput.toString()
    };
}
/**
 * Normalizes and extracts the pure alphanumeric/reference transaction ID from any CBE input.
 * Handles:
 * - Full URLs: https://apps.cbe.com.et/?id=FT26063D7W5C11294152 -> FT26063D7W5C11294152
 * - Hash routes: https://apps.cbe.com.et/#/transaction/FT26063D7W5C11294152 -> FT26063D7W5C11294152
 * - Query strings: ?id=FT26063D7W5C11294152 or ?trx=FT... -> FT26063D7W5C11294152
 * - Path fragments: #/transaction/FT26063D7W5C11294152 or /transaction/FT... -> FT26063D7W5C11294152
 * - Raw identifiers: FT26063D7W5C11294152 -> FT26063D7W5C11294152
 */
export function extractCleanTransactionId(input) {
    if (!input || typeof input !== "string")
        return "";
    const trimmed = input.trim();
    // 1. Check for query parameter (e.g. ?id=..., &id=..., ?trx=..., &ref=...)
    const queryParamMatch = trimmed.match(/[?&](?:id|trx|ref|transaction_id)=([^&#\s]+)/i);
    if (queryParamMatch && queryParamMatch[1]) {
        return decodeURIComponent(queryParamMatch[1]).trim();
    }
    // 2. Check for route path segments like /transaction/{id} or /slip/{id}
    const routeMatch = trimmed.match(/(?:\/transaction\/|\/slip\/|\/receipt\/)([^/?&#\s]+)/i);
    if (routeMatch && routeMatch[1]) {
        return decodeURIComponent(routeMatch[1]).trim();
    }
    // 3. Clean standard prefixes
    let cleaned = trimmed
        .replace(/^\?id=/i, "")
        .replace(/^\?trx=/i, "")
        .replace(/^#\/transaction\//i, "")
        .replace(/^#\//, "")
        .replace(/^\/+/, "");
    // 4. If it's a full URL without specific query param matched above, try parsing via URL
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
        try {
            const parsed = new URL(cleaned);
            const idParam = parsed.searchParams.get("id") || parsed.searchParams.get("trx") || parsed.searchParams.get("ref");
            if (idParam)
                return idParam.trim();
            const segments = parsed.pathname.split("/").filter(Boolean);
            const lastSegment = segments[segments.length - 1];
            if (lastSegment)
                return lastSegment.trim();
        }
        catch {
            // fallback
        }
    }
    // 5. Strip any trailing queries or hashes if still attached
    const beforeQuery = cleaned.split("?")[0] ?? cleaned;
    cleaned = (beforeQuery.split("#")[0] ?? beforeQuery).trim();
    return cleaned;
}
//# sourceMappingURL=cbe-domain.js.map