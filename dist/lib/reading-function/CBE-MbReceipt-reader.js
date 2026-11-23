import * as cheerio from "cheerio";
import { fetchHtmlViaBrowser } from "../../modules/verification/readers/web.reader.js";
import { CBE_MBRECEIPT_HOST } from "../cbe-receipt-hosts.js";
function pickField(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]?.trim()) {
            return match[1].trim();
        }
    }
    return "";
}
export function parseCbeMbReceiptHtml(html) {
    const $ = cheerio.load(html);
    $("script, style, noscript").remove();
    const kv = {};
    $("table tr").each((_, row) => {
        const cells = $(row).find("td, th");
        if (cells.length < 2)
            return;
        const key = cells.eq(0).text().replace(/\s+/g, " ").trim().toLowerCase();
        let value = cells.eq(1).text().trim();
        if (cells.length >= 3 && cells.eq(1).text().trim() === ":") {
            value = cells.eq(2).text().trim();
        }
        if (key && value)
            kv[key] = value;
    });
    const flat = $("body").text().replace(/\s+/g, " ").trim();
    if (/loading receipt/i.test(flat) && flat.length < 400) {
        throw new Error("Mbreciept page did not finish loading receipt content.");
    }
    const payer = kv["payer"] ||
        kv["payer name"] ||
        pickField(flat, [/payer\s*[:]\s*([^]+?)\s+account/i, /from\s*[:]\s*([^]+?)\s+account/i]) ||
        "Unknown";
    const receiver = kv["receiver"] ||
        kv["beneficiary name"] ||
        kv["receiver name"] ||
        pickField(flat, [/receiver\s*[:]\s*([^]+?)\s+account/i, /beneficiary\s*[:]\s*([^]+?)\s+account/i]) ||
        "Unknown";
    const paymentDateTime = kv["payment date & time"] ||
        kv["payment date"] ||
        kv["transaction date"] ||
        pickField(flat, [
            /payment date(?:\s*&\s*time)?\s*[:]\s*([^]+?)(?:\s+reference|\s+transferred|$)/i,
            /transaction date\s*[:]\s*([^]+?)(?:\s+reference|\s+amount|$)/i,
        ]) ||
        "N/A";
    const referenceNo = kv["reference no. (vat invoice no)"] ||
        kv["reference no"] ||
        kv["reference"] ||
        kv["transaction reference"] ||
        pickField(flat, [/reference(?:\s*no)?\.?\s*[:]\s*([A-Z0-9]+)/i]) ||
        "N/A";
    const transferredAmount = kv["transferred amount"] ||
        kv["amount"] ||
        pickField(flat, [
            /transferred amount\s*[:]\s*([0-9,]+(?:\.[0-9]{1,2})?\s*(?:ETB|Birr)?)/i,
            /amount\s*[:]\s*([0-9,]+(?:\.[0-9]{1,2})?\s*(?:ETB|Birr)?)/i,
        ]) ||
        "0.00 ETB";
    const totalAmountDebited = kv["total amount debited"] ||
        pickField(flat, [/total amount debited[^:]*[:]\s*([0-9,]+(?:\.[0-9]{1,2})?[^\\s]*)/i]) ||
        transferredAmount;
    return {
        payer,
        receiver,
        paymentDateTime,
        referenceNo,
        transferredAmount,
        totalAmountDebited,
    };
}
/** Mbreciept hosts a Nuxt SPA — render with a headless browser, then parse HTML. */
export async function readCbeMbReceiptPage(receiptUrl) {
    const html = await fetchHtmlViaBrowser(receiptUrl, CBE_MBRECEIPT_HOST);
    return parseCbeMbReceiptHtml(html);
}
//# sourceMappingURL=CBE-MbReceipt-reader.js.map