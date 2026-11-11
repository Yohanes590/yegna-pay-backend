import { type BankConfig, type BankIdentifier } from "./bank-registry.js";
export type SupportedBankCode = "CBE" | "AWASH" | "BOA";
export declare function tryResolveExplicitBank(input?: string): SupportedBankCode | null;
export declare function toRegistryBankId(bankCode: SupportedBankCode): BankIdentifier;
export declare function getBankConfigByCode(bankCode: SupportedBankCode): BankConfig;
export declare function detectBankFromUrl(candidateUrl: string): SupportedBankCode | null;
export interface ResolvedTransactionBankInput {
    platform?: unknown;
    currency?: unknown;
    rawTransactionId?: unknown;
    rawTransactionUrl?: unknown;
}
export type ResolvedTransactionBankResult = {
    ok: true;
    bankCode: SupportedBankCode;
    bankConfig: BankConfig;
    transactionId: string;
    transactionUrl: string;
    storedCurrency: string;
} | {
    ok: false;
    message: string;
};
export declare function resolveBankAndTransaction({ platform, currency, rawTransactionId, rawTransactionUrl, }: ResolvedTransactionBankInput): ResolvedTransactionBankResult;
//# sourceMappingURL=bank-resolver.d.ts.map