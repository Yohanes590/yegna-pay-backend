import type { BankConfig } from "../../lib/bank-registry.js";
import type { SupportedBankCode } from "../../lib/bank-resolver.js";
export interface NormalizedBankReceipt {
    receiverName: string;
    payerName: string;
    transferredAmount: string | number;
    paymentDateTime: string;
    referenceNo: string;
}
export type FetchReceiptOutcome = {
    ok: true;
    receipt: NormalizedBankReceipt;
} | {
    ok: false;
    transaction_status: "FAILED" | "INVALID";
    message: string;
};
export declare function normalizeBankReceiptName(name?: string | null): string;
export declare function parseNumericAmount(rawAmount: unknown): number | null;
export declare function parseBankReceiptDate(rawDate?: string | null): Date;
export declare function getTodayEthiopiaDateString(): string;
export declare function normalizeProjectEligibilityDate(rawDate?: string | null): {
    valid: boolean;
    normalized: string;
};
export declare function parseProjectEligibilityStartDate(rawRestriction?: string | Date | null): {
    hasRestriction: boolean;
    startDate: Date | null;
    valid: boolean;
};
export declare function fetchAndNormalizeBankReceipt(bankCode: SupportedBankCode, bankConfig: BankConfig, transactionId: string, transactionUrl?: string): Promise<FetchReceiptOutcome>;
export interface VerifyAndSaveTransactionInput {
    bankCode: SupportedBankCode;
    receipt: NormalizedBankReceipt;
    expectedReceiverName: string | null | undefined;
    requestedPriceAmount: unknown;
    projectDateRestriction?: string | Date | null;
    transactionId: string;
    projectId: string;
    currency?: string;
}
export interface VerifyAndSaveTransactionResult {
    status: "VERIFIED" | "FAILED" | "INVALID";
    success: boolean;
    message: string;
    data: Record<string, any> | null;
    error?: string;
    vs?: string;
}
export declare function verifyAndSaveBankTransaction(input: VerifyAndSaveTransactionInput, shouldSave?: boolean): Promise<VerifyAndSaveTransactionResult>;
//# sourceMappingURL=unified-bank-check.d.ts.map