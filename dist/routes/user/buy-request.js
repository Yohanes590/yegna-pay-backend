import { Router } from "express";
import { VerifyToken } from "../../lib/JWT-generate.js";
import { CBEReadingPDF } from "../../lib/reading-function/CBE-Reader.js";
import { CBECheckFunction } from "../../service/bank-features/CBE-check.js";
import { prisma } from "../../lib/prisma.js";
const router = Router();
const ReceiverName = process.env.ACCOUNT_NAME;
const TotalBalance = (request) => {
    const RequestValue = Number(process.env.PER_REQUEST);
    const Total = Number(request) * RequestValue;
    return Total.toFixed(2);
};
router.post("/", async (req, res) => {
    const { token, requestAmount, transaction_id } = req.body;
    if (!token) {
        return res.status(401).json({
            message: "unauthorized user!",
            success: false,
            data: null,
        });
    }
    const TokenVerification = VerifyToken(token);
    if (TokenVerification.status !== 200) {
        return res.status(401).json({
            message: "unauthorized user!",
            success: false,
            data: null,
        });
    }
    const SUMBalance = TotalBalance(requestAmount);
    const existingRevenueRecord = await prisma.revenue.findUnique({
        where: { id: transaction_id },
    });
    const TransactionDataHistory = await prisma.transaction.findUnique({
        where: {
            transaction_id: transaction_id,
        },
    });
    if (existingRevenueRecord) {
        return res.status(400).json({
            message: "Duplicate transaction! This payment has already been claimed.",
            success: false,
            data: null,
        });
    }
    else if (TransactionDataHistory) {
        return res.status(400).json({
            message: "Duplicate transaction! This payment has already been claimed.",
            success: false,
            data: null,
        });
    }
    const ReadingReceipt = await CBEReadingPDF({
        transaction_id,
        platform: "CBE",
    });
    const receiverName = ReadingReceipt?.extractedData?.receiver;
    const transferredAmount = ReadingReceipt?.extractedData?.transferredAmount;
    const DateRestriction = process.env.DATE_RESTRICTION;
    const receiptDate = ReadingReceipt?.extractedData?.paymentDateTime;
    const projectID = process.env.PROJECT_ID;
    const totalAmount = `${SUMBalance} ETB`;
    if (ReadingReceipt?.success) {
        const TransactionData = {
            receiver_name_data: ReceiverName,
            ReceiverInformation: receiverName,
            transferredAmount: transferredAmount,
            price_amount: totalAmount,
            ProjectDateRestriction: DateRestriction,
            ReceiptDate: receiptDate,
            targetID: transaction_id,
            projectId: projectID,
        };
        const CheckUserData = await CBECheckFunction(TransactionData, false);
        if (CheckUserData?.success === false) {
            return res.status(400).json({
                message: CheckUserData.message,
                success: false,
                data: CheckUserData.data,
            });
        }
        const userEmail = TokenVerification.message?.email;
        const userID = TokenVerification.message?.id || TokenVerification.message?.email5;
        const time_stamp = new Date();
        if (!userEmail || !userID) {
            return res.status(400).json({
                message: "Invalid token payload mapping. Missing user information.",
                success: false,
            });
        }
        try {
            const payer = ReadingReceipt.extractedData?.payer || "undefined";
            await prisma.$transaction([
                prisma.users.update({
                    where: { email: userEmail },
                    data: {
                        request_available: { increment: Number(requestAmount) },
                    },
                }),
                prisma.revenue.create({
                    data: {
                        paid_requests: Number(SUMBalance),
                        payer_name: payer,
                        currency: "ETB",
                        id: transaction_id,
                        time_stamp: time_stamp,
                        user_id: userID,
                    },
                }),
            ]);
            return res.status(200).json({
                message: "success reading",
                success: true,
                data: CheckUserData,
                price_amount: totalAmount,
            });
        }
        catch (dbError) {
            console.error("PRISMA TRANSACTION CRASHED:", dbError);
            return res.status(500).json({
                message: "Internal server error saving transaction data.",
                success: false,
                error_details: dbError.message,
            });
        }
    }
    else {
        return res.status(400).json({
            message: "Invalid Transaction ID!",
            success: false,
            data: null,
        });
    }
});
export default router;
//# sourceMappingURL=buy-request.js.map