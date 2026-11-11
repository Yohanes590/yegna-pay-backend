import { prisma } from "../../lib/prisma.js"
export async function TransactionIDCheck(targetID: string) {
    const RevenueIDCheck = await prisma.revenue.findFirst({
        where: {
            id: targetID
        }
    })
    const TransactionID = await prisma.transaction.findFirst({
        where: {
            OR: [
                { transaction_id: targetID },
                { transaction_id: `?id=${targetID}` },
                { transaction_id: `?trx=${targetID}` }
            ]
        }
    })
    if (TransactionID) {
        return {
            status: false,
            message: "Transaction ID Duplicated!",
            transaction_id: targetID
        }
    } else if (RevenueIDCheck) {
        return {
            status: false,
            message: "Transaction ID Duplicated!",
            transaction_id: targetID
        }
    } else {
        return {
            status: true,
            message: "Valid Transaction ID",
            transaction_id: null
        }
    }
}