import "dotenv/config";
import { extractCleanTransactionId } from "../../lib/cbe-domain.js";
import { formatAllowedHostnames, getEnvDomainUrls, matchUrlAgainstAllowedBases, } from "../../lib/parse-env-domains.js";
import { mergeCbeReceiptDomains } from "../../lib/cbe-receipt-hosts.js";
export function getDomainsFromEnv(envVarName, fallbackUrl) {
    try {
        const parsed = getEnvDomainUrls(envVarName, fallbackUrl);
        if (envVarName === "CBE_DOMAIN") {
            return mergeCbeReceiptDomains(parsed);
        }
        return parsed;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "";
        throw new Error(`Invalid ${envVarName} configuration. ${message}`.trim());
    }
}
/** Primary (first) domain — used when building receipt URLs from a bare transaction id. */
export function getDomainFromEnv(envVarName, fallbackUrl) {
    return getDomainsFromEnv(envVarName, fallbackUrl)[0];
}
export function validateBankDomain(envVarName, bankLabel, fallbackUrl, inputUrlStr) {
    if (!inputUrlStr || typeof inputUrlStr !== "string" || inputUrlStr.trim() === "") {
        throw new Error("Transaction URL cannot be empty.");
    }
    const allowedDomains = getDomainsFromEnv(envVarName, fallbackUrl);
    let parsedInput;
    try {
        parsedInput = new URL(inputUrlStr.trim());
    }
    catch {
        throw new Error(`Invalid ${bankLabel} transaction URL format. Must be a valid absolute URL.`);
    }
    const baseDomain = matchUrlAgainstAllowedBases(parsedInput, allowedDomains);
    if (!baseDomain) {
        throw new Error(`Invalid ${bankLabel} domain: "${parsedInput.hostname}". Expected one of: ${formatAllowedHostnames(allowedDomains)}.`);
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