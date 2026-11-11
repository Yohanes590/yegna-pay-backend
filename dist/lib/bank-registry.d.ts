import "dotenv/config";
export type BankIdentifier = "AWAS_BANK" | "CBE" | "BOA";
export interface BankConfig {
    identifier: BankIdentifier;
    displayName: string;
    envVarName: string;
    getDomain: () => URL;
    validateUrl: (inputUrlStr: string) => {
        extractedPath: string;
        fullUrl: string;
    };
    extractId: (inputUrlOrId: string) => string;
    reader: (params: {
        transaction_id: string;
        transaction_url?: string;
    }) => Promise<any>;
}
/**
 * Normalizes input bank identifier into canonical BankIdentifier.
 * Handles aliases like "AWASH", "AWAS_BANK", "CBE", "BOA", "ABYSSINIA".
 */
export declare function normalizeBankIdentifier(input?: string): BankIdentifier;
/**
 * Centralized dynamic bank registry mapping payment methods to their specific domains and existing readers.
 */
export declare const bankRegistry: Record<BankIdentifier, BankConfig>;
/**
 * Resolves the appropriate BankConfig based on method/platform string.
 */
export declare function getBankConfig(platformOrMethod?: string): BankConfig;
//# sourceMappingURL=bank-registry.d.ts.map