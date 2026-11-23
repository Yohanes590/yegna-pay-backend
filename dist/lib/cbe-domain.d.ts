import "dotenv/config";
export { buildCbeReceiptUrl, detectCbeReceiptKind, getCBEDomain, getCBEDomains, mergeCbeReceiptDomains, CBE_MBRECEIPT_HOST, CBE_APPS_HOST, } from "./cbe-receipt-hosts.js";
/**
 * Extracts only the transaction-specific portion that comes after the CBE domain.
 * Supports path, query parameters, and fragments.
 * Validates that the URL belongs to the expected CBE domain using the JavaScript URL API.
 */
export declare function extractCBETransactionPath(inputUrlStr: string): {
    extractedPath: string;
    fullUrl: string;
};
/**
 * Normalizes and extracts the pure alphanumeric/reference transaction ID from any CBE input.
 * Handles:
 * - Full URLs: https://apps.cbe.com.et/?id=FT26063D7W5C11294152 -> FT26063D7W5C11294152
 * - Hash routes: https://apps.cbe.com.et/#/transaction/FT26063D7W5C11294152 -> FT26063D7W5C11294152
 * - Query strings: ?id=FT26063D7W5C11294152 or ?trx=FT... -> FT26063D7W5C11294152
 * - Path fragments: #/transaction/FT26063D7W5C11294152 or /transaction/FT... -> FT26063D7W5C11294152
 * - Raw identifiers: FT26063D7W5C11294152 -> FT26063D7W5C11294152
 */
export declare function extractCleanTransactionId(input: string): string;
//# sourceMappingURL=cbe-domain.d.ts.map