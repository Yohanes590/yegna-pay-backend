import "dotenv/config";
import { CBEReadingPDF } from "./reading-function/CBE-Reader.js";
import { AwashbankReader } from "./reading-function/Awash-bank.js";
import { BOAReadingPDF } from "./reading-function/BOA-reader.js";
import { extractCleanTransactionId } from "./cbe-domain.js";
/**
 * Normalizes input bank identifier into canonical BankIdentifier.
 * Handles aliases like "AWASH", "AWAS_BANK", "CBE", "BOA", "ABYSSINIA".
 */
export function normalizeBankIdentifier(input) {
    const raw = (input || "").toUpperCase().trim().replace(/[-\s]/g, "_");
    if (raw.includes("AWAS") || raw.includes("AWASH")) {
        return "AWAS_BANK";
    }
    if (raw.includes("BOA") || raw.includes("ABYSSINIA")) {
        return "BOA";
    }
    // Default to Commercial Bank of Ethiopia (CBE)
    return "CBE";
}
/**
 * Helper to parse and validate a configured bank domain from environment.
 */
function getDomainFromEnv(envVarName, fallbackUrl) {
    const raw = process.env[envVarName] || fallbackUrl;
    try {
        const parsed = new URL(raw.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error(`Invalid protocol for ${envVarName}: ${parsed.protocol}`);
        }
        return parsed;
    }
    catch (err) {
        throw new Error(`Invalid ${envVarName} configuration: "${raw}". ${err?.message || ""}`.trim());
    }
}
/**
 * Bank-specific URL domain validator. Validates that the input URL matches the bank's configured domain.
 */
function validateBankDomain(envVarName, bankLabel, fallbackUrl, inputUrlStr) {
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
    // Protocol validation
    if (parsedInput.protocol !== baseDomain.protocol) {
        throw new Error(`Invalid ${bankLabel} protocol: "${parsedInput.protocol}". Expected "${baseDomain.protocol}".`);
    }
    // Hostname validation - case-insensitive
    if (parsedInput.hostname.toLowerCase() !== baseDomain.hostname.toLowerCase()) {
        throw new Error(`Invalid ${bankLabel} domain: "${parsedInput.hostname}". Expected "${baseDomain.hostname}".`);
    }
    // Port validation if explicitly defined in configured domain
    if (baseDomain.port && parsedInput.port && parsedInput.port !== baseDomain.port) {
        throw new Error(`Invalid port for ${bankLabel}: "${parsedInput.port}". Expected port "${baseDomain.port}".`);
    }
    // Extract path/parameters
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
        fullUrl: parsedInput.toString()
    };
}
/**
 * Centralized dynamic bank registry mapping payment methods to their specific domains and existing readers.
 */
export const bankRegistry = {
    AWAS_BANK: {
        identifier: "AWAS_BANK",
        displayName: "Awash Bank",
        envVarName: "AWASH_DOMAIN",
        getDomain: () => getDomainFromEnv("AWASH_DOMAIN", "https://awashpay.awashbank.com:8225/"),
        validateUrl: (url) => validateBankDomain("AWASH_DOMAIN", "Awash Bank", "https://awashpay.awashbank.com:8225/", url),
        extractId: (input) => extractCleanTransactionId(input),
        reader: async (params) => {
            const result = await AwashbankReader(params);
            return result;
        }
    },
    CBE: {
        identifier: "CBE",
        displayName: "Commercial Bank of Ethiopia",
        envVarName: "CBE_DOMAIN",
        getDomain: () => getDomainFromEnv("CBE_DOMAIN", "https://apps.cbe.com.et/"),
        validateUrl: (url) => validateBankDomain("CBE_DOMAIN", "CBE", "https://apps.cbe.com.et/", url),
        extractId: (input) => extractCleanTransactionId(input),
        reader: async (params) => {
            const result = await CBEReadingPDF({
                platform: "CBE",
                transaction_id: params.transaction_id,
                ...(params.transaction_url ? { transaction_url: params.transaction_url } : {})
            });
            return result;
        }
    },
    BOA: {
        identifier: "BOA",
        displayName: "Bank of Abyssinia",
        envVarName: "BOA_DOMAIN",
        getDomain: () => getDomainFromEnv("BOA_DOMAIN", "https://cs.bankofabyssinia.com/"),
        validateUrl: (url) => validateBankDomain("BOA_DOMAIN", "Bank of Abyssinia", "https://cs.bankofabyssinia.com/", url),
        extractId: (input) => extractCleanTransactionId(input),
        reader: async (params) => {
            const result = await BOAReadingPDF(params);
            return result;
        }
    }
};
/**
 * Resolves the appropriate BankConfig based on method/platform string.
 */
export function getBankConfig(platformOrMethod) {
    const key = normalizeBankIdentifier(platformOrMethod);
    return bankRegistry[key];
}
//# sourceMappingURL=bank-registry.js.map