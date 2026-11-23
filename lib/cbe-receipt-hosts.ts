import { getEnvDomainUrls, parseDomainEnvValue } from "./parse-env-domains.js";
import { buildBankReceiptUrl } from "../modules/verification/domain.js";

/** Official CBE receipt hosts (env may list a subset; we always allow both). */
export const CBE_KNOWN_RECEIPT_ORIGINS = [
    "https://apps.cbe.com.et/",
    "https://mbreciept.cbe.com.et/",
] as const;

export const CBE_APPS_HOST = "apps.cbe.com.et";
export const CBE_MBRECEIPT_HOST = "mbreciept.cbe.com.et";

export type CbeReceiptLinkKind = "apps" | "mbreciept";

export function mergeCbeReceiptDomains(envUrls: URL[]): URL[] {
    const known = parseDomainEnvValue(CBE_KNOWN_RECEIPT_ORIGINS.join(", "), "CBE_DOMAIN");
    const byHost = new Map<string, URL>();
    for (const u of [...envUrls, ...known]) {
        byHost.set(u.hostname.toLowerCase(), u);
    }
    return Array.from(byHost.values());
}

export function getCBEDomains(): URL[] {
    const fromEnv = getEnvDomainUrls("CBE_DOMAIN", CBE_KNOWN_RECEIPT_ORIGINS[0]);
    return mergeCbeReceiptDomains(fromEnv);
}

export function getCBEDomain(): URL {
    const domains = getCBEDomains();
    const apps =
        domains.find((d) => d.hostname.toLowerCase() === CBE_APPS_HOST) ?? domains[0];
    return apps!;
}

export function detectCbeReceiptKind(url: string): CbeReceiptLinkKind | null {
    try {
        const host = new URL(url.trim()).hostname.toLowerCase();
        if (host === CBE_MBRECEIPT_HOST) return "mbreciept";
        if (host === CBE_APPS_HOST) return "apps";
    } catch {
        return null;
    }
    return null;
}

/**
 * Build the receipt fetch URL for CBE (apps ?id=… vs mbreciept /v2-… paths).
 */
export function buildCbeReceiptUrl(transaction_id: string, transaction_url?: string): string {
    if (transaction_url && (transaction_url.startsWith("http://") || transaction_url.startsWith("https://"))) {
        return transaction_url.trim();
    }
    if (transaction_id.startsWith("http://") || transaction_id.startsWith("https://")) {
        return transaction_id.trim();
    }

    const cleanId = transaction_id.trim();
    const domains = getCBEDomains();
    const mbBase = domains.find((d) => d.hostname.toLowerCase() === CBE_MBRECEIPT_HOST);
    const appsBase = getCBEDomain();

    if (/^v2-/i.test(cleanId) && mbBase) {
        const base = mbBase.toString().endsWith("/") ? mbBase.toString() : `${mbBase.toString()}/`;
        return `${base}${cleanId.replace(/^\//, "")}`;
    }

    if (
        cleanId.startsWith("?") ||
        cleanId.startsWith("#") ||
        cleanId.startsWith("/")
    ) {
        return buildBankReceiptUrl(appsBase, cleanId);
    }

    return buildBankReceiptUrl(appsBase, cleanId);
}