import { bankRegistry, type BankConfig, type BankIdentifier } from "./bank-registry.js";
import { extractCleanTransactionId } from "./cbe-domain.js";

export type SupportedBankCode = "CBE" | "AWASH" | "BOA";

const BANK_ALIAS_MAP: Record<string, SupportedBankCode> = {
    CBE: "CBE",
    "COMMERCIAL BANK OF ETHIOPIA": "CBE",
    COMMERCIAL_BANK_OF_ETHIOPIA: "CBE",
    AWASH: "AWASH",
    AWAS: "AWASH",
    AWAS_BANK: "AWASH",
    AWASH_BANK: "AWASH",
    "AWASH BANK": "AWASH",
    AWASHPAY: "AWASH",
    BOA: "BOA",
    ABYSSINIA: "BOA",
    "BANK OF ABYSSINIA": "BOA",
    BANK_OF_ABYSSINIA: "BOA",
};

const BANK_CODE_TO_REGISTRY_ID: Record<SupportedBankCode, BankIdentifier> = {
    CBE: "CBE",
    AWASH: "AWAS_BANK",
    BOA: "BOA",
};

export function tryResolveExplicitBank(input?: string): SupportedBankCode | null {
    if (!input || typeof input !== "string") {
        return null;
    }
    const normalized = input.trim().toUpperCase();
    if (!normalized) {
        return null;
    }
    return BANK_ALIAS_MAP[normalized] || null;
}

export function toRegistryBankId(bankCode: SupportedBankCode): BankIdentifier {
    return BANK_CODE_TO_REGISTRY_ID[bankCode];
}

export function getBankConfigByCode(bankCode: SupportedBankCode): BankConfig {
    return bankRegistry[toRegistryBankId(bankCode)];
}

export function detectBankFromUrl(candidateUrl: string): SupportedBankCode | null {
    let parsed: URL;
    try {
        parsed = new URL(candidateUrl);
    } catch {
        return null;
    }

    const inputHost = parsed.hostname.toLowerCase();
    for (const code of ["CBE", "AWASH", "BOA"] as const) {
        try {
            const expectedUrl = getBankConfigByCode(code).getDomain();
            if (expectedUrl.hostname.toLowerCase() === inputHost) {
                return code;
            }
        } catch {
            // Skip banks whose env domain is missing/invalid during auto-detection
        }
    }

    return null;
}

export interface ResolvedTransactionBankInput {
    platform?: unknown;
    currency?: unknown;
    rawTransactionId?: unknown;
    rawTransactionUrl?: unknown;
}

export type ResolvedTransactionBankResult =
    | {
          ok: true;
          bankCode: SupportedBankCode;
          bankConfig: BankConfig;
          transactionId: string;
          transactionUrl: string;
          storedCurrency: string;
      }
    | {
          ok: false;
          message: string;
      };

export function resolveBankAndTransaction({
    platform,
    currency,
    rawTransactionId,
    rawTransactionUrl,
}: ResolvedTransactionBankInput): ResolvedTransactionBankResult {
    const rawUrlStr = typeof rawTransactionUrl === "string" ? rawTransactionUrl.trim() : "";
    const rawIdStr = typeof rawTransactionId === "string" ? rawTransactionId.trim() : "";
    const candidateUrl =
        rawUrlStr || (rawIdStr.startsWith("http://") || rawIdStr.startsWith("https://") ? rawIdStr : "");

    const currencyStr = typeof currency === "string" ? currency.trim() : "";
    const platformStr = typeof platform === "string" ? platform.trim() : "";

    const currencyBank = tryResolveExplicitBank(currencyStr);
    let bankCode: SupportedBankCode;

    if (currencyBank) {
        // Callers occasionally pass the target bank inside `currency` (e.g. currency: "AWASH")
        bankCode = currencyBank;
    } else if (platformStr) {
        const resolvedPlatform = tryResolveExplicitBank(platformStr);
        if (!resolvedPlatform) {
            return {
                ok: false,
                message: `Unknown platform "${platformStr}" to process transaction`,
            };
        }
        bankCode = resolvedPlatform;
    } else if (candidateUrl) {
        bankCode = detectBankFromUrl(candidateUrl) || "CBE";
    } else {
        bankCode = "CBE";
    }

    const bankConfig = getBankConfigByCode(bankCode);
    const storedCurrency = currencyBank || !currencyStr ? "ETB" : currencyStr.toUpperCase();

    if (candidateUrl) {
        try {
            const { extractedPath, fullUrl } = bankConfig.validateUrl(candidateUrl);
            const cleanId =
                bankConfig.extractId(candidateUrl) ||
                extractCleanTransactionId(candidateUrl) ||
                extractCleanTransactionId(extractedPath);

            if (!cleanId) {
                return {
                    ok: false,
                    message: `Could not extract a valid ${bankConfig.displayName} transaction ID from URL.`,
                };
            }

            return {
                ok: true,
                bankCode,
                bankConfig,
                transactionId: cleanId,
                transactionUrl: fullUrl,
                storedCurrency,
            };
        } catch (err: any) {
            return {
                ok: false,
                message: err?.message || `Invalid ${bankConfig.displayName} transaction URL.`,
            };
        }
    }

    if (!rawIdStr) {
        return {
            ok: false,
            message: "Missing required field: transaction_url, transaction_id, or receipt_image.",
        };
    }

    const cleanId = bankConfig.extractId(rawIdStr) || extractCleanTransactionId(rawIdStr);
    if (!cleanId) {
        return {
            ok: false,
            message: "Invalid transaction_id provided.",
        };
    }

    return {
        ok: true,
        bankCode,
        bankConfig,
        transactionId: cleanId,
        transactionUrl: "",
        storedCurrency,
    };
}

