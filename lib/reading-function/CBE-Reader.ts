import "dotenv/config";
import { fetchAndParsePdf } from "../../modules/verification/readers/pdf.reader.js";

interface CBEReceiptData {
    payer: string;
    receiver: string;
    paymentDateTime: string;
    referenceNo: string;
    transferredAmount: string;
    totalAmountDebited: string;
}

export async function CBEReadingPDF(transactionData: { platform: string; transaction_id: string; transaction_url?: string }) {
    const rawCbeDomain = process.env.CBE_DOMAIN || "https://apps.cbe.com.et/";
    const normalizedDomain = rawCbeDomain.endsWith("/") ? rawCbeDomain : `${rawCbeDomain}/`;

    let cbe_link: string;
    if (transactionData.transaction_url && (transactionData.transaction_url.startsWith("http://") || transactionData.transaction_url.startsWith("https://"))) {
        cbe_link = transactionData.transaction_url;
    } else if (transactionData.transaction_id && (transactionData.transaction_id.startsWith("http://") || transactionData.transaction_id.startsWith("https://"))) {
        cbe_link = transactionData.transaction_id;
    } else if (transactionData.transaction_id && (transactionData.transaction_id.startsWith("?") || transactionData.transaction_id.startsWith("#") || transactionData.transaction_id.startsWith("/"))) {
        cbe_link = `${normalizedDomain}${transactionData.transaction_id.replace(/^\//, "")}`;
    } else {
        cbe_link = `${normalizedDomain}?id=${transactionData.transaction_id}`;
    }

    try {
        const cbeHost = new URL(normalizedDomain).hostname;
        const { text: rawText } = await fetchAndParsePdf(cbe_link, cbeHost);
        const extracted: CBEReceiptData = {
            payer: (rawText.match(/Payer\s*([\s\S]*?)\nAccount/i)?.[1] ?? "Unknown")
                .trim()
                .replace(/\n/g, " "),

            receiver: (rawText.match(/Receiver\s*([\s\S]*?)\nAccount/i)?.[1] ?? "Unknown")
                .trim()
                .replace(/\n/g, " "),

            paymentDateTime: (rawText.match(/Payment Date & Time\s*(.*)\n/i)?.[1] ?? "N/A")
                .trim(),

            referenceNo: (rawText.match(/Reference No\. \(VAT Invoice No\)\s*(.*)\n/i)?.[1] ?? "N/A")
                .trim(),

            transferredAmount: (rawText.match(/Transferred Amount\s*(.*)\n/i)?.[1] ?? "0.00 ETB")
                .trim(),

            totalAmountDebited: (rawText.match(/Total amount debited from customers account\s*(.*)\n/i)?.[1] ?? "0.00 ETB")
                .trim()
        };

        const isVerified = Boolean(
            extracted.referenceNo &&
            (transactionData.transaction_id.includes(extracted.referenceNo) ||
             extracted.referenceNo.includes(transactionData.transaction_id) ||
             (extracted.referenceNo + "11294152" === transactionData.transaction_id))
        );

        return {
            success: true,
            extractedData: extracted,
            isVerified
        };

    } catch (error: any) {
        return { success: false, error: error?.message || "Failed to read receipt" };
    }
}
