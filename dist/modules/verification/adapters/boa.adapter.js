import { BOAReadingPDF } from "../../../lib/reading-function/BOA-reader.js";
export const boaAdapter = {
    adapterId: "boa",
    platform: "BOA",
    registryId: "BOA",
    displayName: "Bank of Abyssinia",
    linkReadable: "web",
    async fetchTransaction(params) {
        const raw = await BOAReadingPDF({
            transaction_id: params.transaction_id,
            ...(params.transaction_url ? { transaction_url: params.transaction_url } : {}),
        });
        return { raw };
    },
    normalizeReceipt(raw, transactionId) {
        const readerResult = raw;
        if (!readerResult ||
            (!readerResult.receiverName &&
                !readerResult.receiverAccount &&
                !readerResult.transferredAmount &&
                !readerResult.transactionReference)) {
            return {
                ok: false,
                transaction_status: "FAILED",
                message: "Could not verify transaction with Bank of Abyssinia.",
            };
        }
        return {
            ok: true,
            receipt: {
                receiverName: readerResult.receiverName || "",
                payerName: readerResult.senderName || "",
                transferredAmount: readerResult.transferredAmount ?? "",
                paymentDateTime: readerResult.transactionDate || "",
                referenceNo: readerResult.transactionReference || transactionId,
            },
        };
    },
};
//# sourceMappingURL=boa.adapter.js.map