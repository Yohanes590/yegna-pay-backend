import { prisma } from "../../lib/prisma.js";

export async function TransactionLogSaved(transactionData: any) {
    try {
        const candidateTxId = transactionData?.transaction_id
            ? String(transactionData.transaction_id).trim()
            : "";
        let resolvedTxId: string | null = null;

        // Avoid FK violations when logging pre-save failures, Revenue IDs, or legacy ?id= records
        if (candidateTxId) {
            const existingTx = await prisma.transaction.findFirst({
                where: {
                    OR: [
                        { transaction_id: candidateTxId },
                        { transaction_id: `?id=${candidateTxId}` },
                        { transaction_id: `?trx=${candidateTxId}` },
                    ],
                },
                select: { transaction_id: true },
            });
            resolvedTxId = existingTx?.transaction_id ?? null;
        }

        const baseMessage = transactionData?.message || "";
        const formattedMessage =
            candidateTxId && !resolvedTxId && !baseMessage.includes(candidateTxId)
                ? `${baseMessage ? `${baseMessage} ` : ""}[tx: ${candidateTxId}]`
                : baseMessage;

        const log = await prisma.transactionLog.create({
            data: {
                transaction_id: resolvedTxId,
                event: transactionData?.event || "UNKNOWN_EVENT",
                message: formattedMessage,
                transaction_status:
                    transactionData?.transaction_status || "PENDING",
                transaction_bank:
                    transactionData?.transaction_bank || "UNKNOWN",
            }
        });

        return {
            data: log,
            success: true,
            message: "Transaction log saved successfully."
        };
    } catch (error: any) {
        console.error("❌ Transaction Logger Failed:", error);

        return {
            data: null,
            success: false,
            message: `Can't save transaction Log: ${error.message}`
        };
    }
}