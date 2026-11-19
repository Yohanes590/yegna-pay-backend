import type { BankAdapter, AdapterFetchResult, AdapterNormalizeOutcome, ReaderFetchParams } from "../bank.types.js";
import { AwashbankReader, type AwashReceiptData } from "../../../lib/reading-function/Awash-bank.js";

export const awashAdapter: BankAdapter = {
    adapterId: "awash",
    platform: "AWASH",
    registryId: "AWAS_BANK",
    displayName: "Awash Bank",
    linkReadable: "web",

    async fetchTransaction(params: ReaderFetchParams): Promise<AdapterFetchResult> {
        const raw = await AwashbankReader({
            transaction_id: params.transaction_id,
            ...(params.transaction_url ? { transaction_url: params.transaction_url } : {}),
        });
        return { raw };
    },

    normalizeReceipt(raw: unknown, transactionId: string): AdapterNormalizeOutcome {
        const readerResult = raw as AwashReceiptData;

        if (
            !readerResult ||
            (!readerResult.receiverName &&
                !readerResult.receiverAccount &&
                !readerResult.transferredAmount &&
                !readerResult.transactionReference)
        ) {
            return {
                ok: false,
                transaction_status: "FAILED",
                message: "Could not verify transaction with Awash Bank.",
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