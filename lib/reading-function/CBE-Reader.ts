import "dotenv/config";
import * as cheerio from "cheerio";
import {
    buildCbeReceiptUrl,
    detectCbeReceiptKind,
    CBE_MBRECEIPT_HOST,
} from "../cbe-receipt-hosts.js";
import { extractCleanTransactionId } from "../cbe-domain.js";
import { fetchAndParsePdf } from "../../modules/verification/readers/pdf.reader.js";
import { fetchHtmlViaHttp } from "../../modules/verification/readers/web.reader.js";

interface CBEReceiptData {
    payer: string;
    receiver: string;
    paymentDateTime: string;
    referenceNo: string;
    transferredAmount: string;
    totalAmountDebited: string;
}

function extractCbeFieldsFromReceiptText(rawText: string): CBEReceiptData {
    return {
        payer: (rawText.match(/Payer\s*([\s\S]*?)\nAccount/i)?.[1] ?? "Unknown")
            .trim()
            .replace(/\n/g, " "),

        receiver: (rawText.match(/Receiver\s*([\s\S]*?)\nAccount/i)?.[1] ?? "Unknown")
            .trim()
            .replace(/\n/g, " "),

        paymentDateTime: (rawText.match(/Payment Date & Time\s*(.*)\n/i)?.[1] ?? "N/A").trim(),

        referenceNo: (rawText.match(/Reference No\. \(VAT Invoice No\)\s*(.*)\n/i)?.[1] ?? "N/A").trim(),

        transferredAmount: (rawText.match(/Transferred Amount\s*(.*)\n/i)?.[1] ?? "0.00 ETB").trim(),

        totalAmountDebited: (
            rawText.match(/Total amount debited from customers account\s*(.*)\n/i)?.[1] ?? "0.00 ETB"
        ).trim(),
    };
}

function verifyCbeReceiptReference(
    transaction_id: string,
    transaction_url: string | undefined,
    receiptUrl: string,
    referenceNo: string,
    receiptText: string
): boolean {
    const cleanId = extractCleanTransactionId(transaction_id) || transaction_id.trim();
    const slugFromUrl = (() => {
        try {
            const seg = new URL(receiptUrl).pathname.split("/").filter(Boolean).pop();
            return seg || "";
        } catch {
            return "";
        }
    })();

  if (detectCbeReceiptKind(receiptUrl) === "mbreciept") {
        if (slugFromUrl && (cleanId.includes(slugFromUrl) || slugFromUrl === cleanId)) {
            return receiptText.length > 80;
        }
        if (cleanId.startsWith("v2-") && receiptUrl.toLowerCase().includes(cleanId.toLowerCase())) {
            return receiptText.length > 80;
        }
    }

    if (!referenceNo || referenceNo === "N/A") {
        return false;
    }

    return Boolean(
        cleanId.includes(referenceNo) ||
            referenceNo.includes(cleanId) ||
            referenceNo + "11294152" === cleanId ||
            (transaction_url && transaction_url.includes(referenceNo))
    );
}

async function readCbeAppsPdfReceipt(receiptUrl: string, allowedHost: string): Promise<string> {
    const { text } = await fetchAndParsePdf(receiptUrl, allowedHost);
    return text;
}

async function readCbeMbReceiptHtml(receiptUrl: string): Promise<string> {
    const html = await fetchHtmlViaHttp(receiptUrl, CBE_MBRECEIPT_HOST);
    const $ = cheerio.load(html);
    $("script, style, noscript").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    if (text.length < 40) {
        throw new Error("Mbreciept page did not contain readable receipt content.");
    }
    return text;
}

export async function CBEReadingPDF(transactionData: {
    platform: string;
    transaction_id: string;
    transaction_url?: string;
}) {
    const receiptUrl = buildCbeReceiptUrl(transactionData.transaction_id, transactionData.transaction_url);
    const kind = detectCbeReceiptKind(receiptUrl) ?? "apps";
    const cbeHost = new URL(receiptUrl).hostname;

    try {
        let rawText: string;

        if (kind === "mbreciept") {
            try {
                rawText = await readCbeMbReceiptHtml(receiptUrl);
            } catch {
                rawText = await readCbeAppsPdfReceipt(receiptUrl, cbeHost);
            }
        } else {
            rawText = await readCbeAppsPdfReceipt(receiptUrl, cbeHost);
        }

        const extracted = extractCbeFieldsFromReceiptText(rawText);

        const isVerified = verifyCbeReceiptReference(
            transactionData.transaction_id,
            transactionData.transaction_url,
            receiptUrl,
            extracted.referenceNo,
            rawText
        );

        return {
            success: true,
            extractedData: extracted,
            isVerified,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to read receipt";
        return { success: false, error: message };
    }
}