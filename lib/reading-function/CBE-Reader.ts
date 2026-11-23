import "dotenv/config";
import {
    buildCbeReceiptUrl,
    detectCbeReceiptKind,
} from "../cbe-receipt-hosts.js";
import { extractCleanTransactionId } from "../cbe-domain.js";
import { fetchAndParsePdf } from "../../modules/verification/readers/pdf.reader.js";
import { readCbeMbReceiptPage } from "./CBE-MbReceipt-reader.js";

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
        const hasReceiptBody =
            receiptText.length > 120 &&
            !/^loading receipt/i.test(receiptText.trim()) &&
            (/\d/.test(receiptText) || /etb|birr|amount|transferred/i.test(receiptText));

        if (slugFromUrl && (cleanId.includes(slugFromUrl) || slugFromUrl === cleanId) && hasReceiptBody) {
            return true;
        }
        if (cleanId.startsWith("v2-") && receiptUrl.toLowerCase().includes(cleanId.toLowerCase()) && hasReceiptBody) {
            return true;
        }
        if (referenceNo && referenceNo !== "N/A" && cleanId.includes(referenceNo)) {
            return true;
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

async function readCbeAppsPdfReceipt(receiptUrl: string, allowedHost: string): Promise<CBEReceiptData> {
    const { text } = await fetchAndParsePdf(receiptUrl, allowedHost);
    return extractCbeFieldsFromReceiptText(text);
}

export async function CBEReadingPDF(transactionData: {
    platform: string;
    transaction_id: string;
    transaction_url?: string;
}) {
    const receiptUrl = buildCbeReceiptUrl(transactionData.transaction_id, transactionData.transaction_url);
    const kind = detectCbeReceiptKind(receiptUrl) ?? "apps";

    try {
        let extracted: CBEReceiptData;
        let rawText: string;

        if (kind === "mbreciept") {
            extracted = await readCbeMbReceiptPage(receiptUrl);
            rawText = JSON.stringify(extracted);
        } else {
            extracted = await readCbeAppsPdfReceipt(receiptUrl, new URL(receiptUrl).hostname);
            rawText = [
                extracted.payer,
                extracted.receiver,
                extracted.referenceNo,
                extracted.transferredAmount,
            ].join(" ");
        }

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