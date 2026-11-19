import type { NormalizedBankReceipt } from "../../service/bank-features/unified-bank-check.js";
export type LinkReadable = "web" | "pdf";
export type BankRegistryId = "CBE" | "AWAS_BANK" | "BOA";
/** Platform code stored on transactions and returned in API responses. */
export type BankPlatformCode = "CBE" | "AWASH" | "BOA";
export interface BankJsonEntry {
    name: string;
    platform: BankPlatformCode;
    registryId: BankRegistryId;
    enabled: boolean;
    domain_env: string;
    domain_fallback: string;
    link_readable: LinkReadable;
    adapter: string;
    aliases?: string[];
}
export interface BanksConfigFile {
    banks: BankJsonEntry[];
}
export interface ReaderFetchParams {
    transaction_id: string;
    transaction_url?: string;
    baseDomain: URL;
}
export interface AdapterFetchResult {
    raw: unknown;
}
export interface AdapterNormalizeResult {
    ok: true;
    receipt: NormalizedBankReceipt;
    invalidReference?: boolean;
}
export interface AdapterNormalizeFailure {
    ok: false;
    transaction_status: "FAILED" | "INVALID";
    message: string;
}
export type AdapterNormalizeOutcome = AdapterNormalizeResult | AdapterNormalizeFailure;
export interface BankAdapter {
    readonly adapterId: string;
    readonly platform: BankPlatformCode;
    readonly registryId: BankRegistryId;
    readonly displayName: string;
    readonly linkReadable: LinkReadable;
    fetchTransaction(params: ReaderFetchParams): Promise<AdapterFetchResult>;
    normalizeReceipt(raw: unknown, transactionId: string): AdapterNormalizeOutcome;
}
export interface RuntimeBankDefinition {
    entry: BankJsonEntry;
    adapter: BankAdapter;
}
//# sourceMappingURL=bank.types.d.ts.map