import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
function isTransactionUniqueConstraint(error) {
    const target = error.meta?.target;
    if (Array.isArray(target)) {
        return target.some((item) => String(item).toLowerCase().includes("transaction_id"));
    }
    if (typeof target === "string") {
        return target.toLowerCase().includes("transaction_id");
    }
    // Prisma PostgreSQL adapter may omit meta.target or put constraint name in message
    const msg = (error.message || "").toLowerCase();
    return msg.includes("transaction_id");
}
export async function SaveTransactionData(transactionData, projectID) {
    try {
        await prisma.transaction.create({
            data: {
                transaction_amount: transactionData.transaction_amount,
                transaction_id: String(transactionData.transaction_id),
                method: transactionData.method,
                transaction_status: transactionData.transaction_status || transactionData.status || "verified",
                from: transactionData.from || "Unknown Payer",
                to: transactionData.to,
                currency: transactionData.currency || "ETB",
                risk_score: transactionData.risk_score,
                projectId: projectID,
            },
        });
        return { message: "success", success: true };
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            if (isTransactionUniqueConstraint(error)) {
                return {
                    message: "This transaction has already been verified",
                    success: false,
                    isDuplicate: true,
                    errorKey: "DUPLICATE_TRANSACTION",
                };
            }
        }
        console.error("[SaveTransactionData Error]", error?.stack || error?.message || error);
        return {
            message: "Internal Server Error",
            success: false,
            isDatabaseError: true,
            errorKey: "DATABASE_ERROR",
        };
    }
}
//# sourceMappingURL=save-transaction.js.map