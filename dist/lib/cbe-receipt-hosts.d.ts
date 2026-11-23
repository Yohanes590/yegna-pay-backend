/** Official CBE receipt hosts (env may list a subset; we always allow both). */
export declare const CBE_KNOWN_RECEIPT_ORIGINS: readonly ["https://apps.cbe.com.et/", "https://mbreciept.cbe.com.et/"];
export declare const CBE_APPS_HOST = "apps.cbe.com.et";
export declare const CBE_MBRECEIPT_HOST = "mbreciept.cbe.com.et";
export type CbeReceiptLinkKind = "apps" | "mbreciept";
export declare function mergeCbeReceiptDomains(envUrls: URL[]): URL[];
export declare function getCBEDomains(): URL[];
export declare function getCBEDomain(): URL;
export declare function detectCbeReceiptKind(url: string): CbeReceiptLinkKind | null;
/**
 * Build the receipt fetch URL for CBE (apps ?id=… vs mbreciept /v2-… paths).
 */
export declare function buildCbeReceiptUrl(transaction_id: string, transaction_url?: string): string;
//# sourceMappingURL=cbe-receipt-hosts.d.ts.map