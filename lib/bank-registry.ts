import {
    buildAllLegacyBankConfigs,
    buildLegacyBankConfig,
    getAliasMap,
    getRuntimeBankByPlatform,
} from "../modules/verification/bank.registry.js";
import type { BankConfig, BankIdentifier } from "./bank-registry.types.js";

export type { BankConfig, BankIdentifier } from "./bank-registry.types.js";

/**
 * Normalizes input bank identifier into canonical BankIdentifier.
 * Aliases are loaded from config/banks.json.
 */
export function normalizeBankIdentifier(input?: string): BankIdentifier {
    const raw = (input || "").toUpperCase().trim().replace(/[-\s]/g, "_");
    const alias = getAliasMap().get(raw);
    if (alias) {
        const runtime = getRuntimeBankByPlatform(alias);
        if (runtime) return runtime.entry.registryId;
    }
    if (raw.includes("AWAS") || raw.includes("AWASH")) {
        return "AWAS_BANK";
    }
    if (raw.includes("BOA") || raw.includes("ABYSSINIA")) {
        return "BOA";
    }
    return "CBE";
}

export const bankRegistry: Record<BankIdentifier, BankConfig> = buildAllLegacyBankConfigs();

export function getBankConfig(platformOrMethod?: string): BankConfig {
    const key = normalizeBankIdentifier(platformOrMethod);
    return buildLegacyBankConfig(key);
}