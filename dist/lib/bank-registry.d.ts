import type { BankConfig, BankIdentifier } from "./bank-registry.types.js";
export type { BankConfig, BankIdentifier } from "./bank-registry.types.js";
/**
 * Normalizes input bank identifier into canonical BankIdentifier.
 * Aliases are loaded from config/banks.json.
 */
export declare function normalizeBankIdentifier(input?: string): BankIdentifier;
export declare const bankRegistry: Record<BankIdentifier, BankConfig>;
export declare function getBankConfig(platformOrMethod?: string): BankConfig;
//# sourceMappingURL=bank-registry.d.ts.map