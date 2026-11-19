import { buildBankReceiptUrl } from "../domain.js";
import { CBEReadingPDF } from "../../../lib/reading-function/CBE-Reader.js";
/**
 * CBE adapter — preserves legacy PDF extraction rules in CBE-Reader while
 * routing through the pdf reader pipeline (timeouts + size limits in reader layer).
 */
export const cbeAdapter = {
    adapterId: "cbe",
    platform: "CBE",
    registryId: "CBE",
    displayName: "Commercial Bank of Ethiopia",
    linkReadable: "pdf",
    async fetchTransaction(params) {
        const url = params.transaction_url && params.transaction_url.startsWith("http")
            ? params.transaction_url
            : buildBankReceiptUrl(params.baseDomain, params.transaction_id, params.transaction_url);
        const result = await CBEReadingPDF({
            platform: "CBE",
            transaction_id: params.transaction_id,
            transaction_url: url,
        });
        return { raw: result };
    },
    normalizeReceipt(raw, transactionId) {
        const readerResult = raw;
        if (!readerResult?.success || !readerResult.extractedData) {
            return {
                ok: false,
                transaction_status: "FAILED",
                message: readerResult?.error || "Could not verify transaction with Commercial Bank of Ethiopia.",
            };
        }
        if (!readerResult.isVerified) {
            return {
                ok: false,
                transaction_status: "INVALID",
                message: "Transaction reference does not match CBE receipt reference.",
            };
        }
        const { extractedData } = readerResult;
        return {
            ok: true,
            receipt: {
                receiverName: extractedData.receiver || "",
                payerName: extractedData.payer || "",
                transferredAmount: extractedData.transferredAmount ?? "",
                paymentDateTime: extractedData.paymentDateTime || "",
                referenceNo: extractedData.referenceNo || transactionId,
            },
        };
    },
};
//# sourceMappingURL=cbe.adapter.js.map