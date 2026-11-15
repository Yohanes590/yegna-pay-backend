import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { VerifyToken } from "../../lib/JWT-generate.js";
import { prisma } from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import { getBillingConfig } from "../../lib/billing-config.js";
import { getBankConfig, normalizeBankIdentifier } from "../../lib/bank-registry.js";
import { buildErrorResponse } from "../../src/utils/error-registry.js";
import { createNotification } from "../../lib/notification-service.js";
import { normalizeBankReceiptName, parseNumericAmount, parseBankReceiptDate, } from "../../service/bank-features/unified-bank-check.js";
const router = Router();
async function resolveAuthenticatedUser(req) {
    const authHeader = req.headers.authorization;
    const clientToken = req.body?.token || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader);
    let userEmail = null;
    let userId = null;
    if (clientToken && typeof clientToken === "string" && clientToken.trim() !== "") {
        const decoded = VerifyToken(clientToken.trim());
        if (decoded.status === 200 && decoded.message?.email) {
            userEmail = decoded.message.email;
            userId = decoded.message.id;
        }
        else {
            try {
                const dbSession = await prisma.session.findUnique({
                    where: { token: clientToken.trim() },
                    include: { user: true },
                });
                if (dbSession && dbSession.expiresAt > new Date() && dbSession.user?.email) {
                    userEmail = dbSession.user.email;
                    userId = dbSession.user.id;
                }
            }
            catch {
                // ignore
            }
        }
    }
    if (!userEmail) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers)
            });
            if (session?.user?.email) {
                userEmail = session.user.email;
                userId = session.user.id;
            }
        }
        catch {
            // session check failed
        }
    }
    if (!userEmail)
        return null;
    const user = await prisma.users.findUnique({
        where: { email: userEmail },
        include: {
            revenues: {
                orderBy: { time_stamp: "desc" }
            }
        }
    });
    return user;
}
// GET /user/buy-request - Fetch essential billing summary and purchase history
router.get("/", async (req, res, next) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            const errPayload = buildErrorResponse("UNAUTHORIZED", {
                message: "Unauthorized. Please sign in to view billing.",
            });
            return res.status(errPayload.status).json(errPayload);
        }
        const config = getBillingConfig();
        const freeRemaining = user.free_requests_remaining ?? 0;
        const freeUsed = user.free_requests_used ?? 0;
        const paidBalance = user.paid_requests_balance ?? 0;
        const paidUsed = user.paid_requests_used ?? 0;
        const totalUsed = freeUsed + paidUsed;
        return res.status(200).json({
            status: 200,
            success: true,
            billing: {
                free_requests_remaining: freeRemaining,
                free_requests_used: freeUsed,
                paid_requests_balance: paidBalance,
                paid_requests_used: paidUsed,
                total_requests_used: totalUsed,
                total_available: freeRemaining + paidBalance,
                cost_per_request: config.costPerRequest,
                currency: config.currency,
                account_user_name: config.accountUserName,
                account_number: config.accountNumber,
                billing_method: config.billingMethod,
                purchase_history: user.revenues || []
            }
        });
    }
    catch (err) {
        return next(err);
    }
});
// POST /user/buy-request - Purchase additional verification requests
router.post("/", async (req, res, next) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            const errPayload = buildErrorResponse("UNAUTHORIZED", {
                message: "Unauthorized user! Please log in.",
            });
            return res.status(errPayload.status).json(errPayload);
        }
        const { transaction_id, platform } = req.body;
        // 1. Validate transaction reference
        if (!transaction_id || typeof transaction_id !== "string" || transaction_id.trim() === "") {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Transaction reference or receipt link is required."
            });
        }
        const config = getBillingConfig();
        const requestedBank = platform ? normalizeBankIdentifier(platform) : normalizeBankIdentifier(config.billingMethod);
        const bankConfig = getBankConfig(requestedBank);
        const paymentPlatform = bankConfig.identifier;
        // Validate that requested billing rail matches configured billing method
        const configuredNormalized = normalizeBankIdentifier(config.billingMethod);
        if (paymentPlatform !== configuredNormalized) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: `Invalid billing method. Payment must be made using ${config.billingMethod}.`
            });
        }
        const rawTxInput = transaction_id.trim();
        let transactionUrl = "";
        if (rawTxInput.startsWith("http://") || rawTxInput.startsWith("https://")) {
            try {
                const { fullUrl } = bankConfig.validateUrl(rawTxInput);
                transactionUrl = fullUrl;
            }
            catch (err) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: err?.message || `Invalid ${bankConfig.displayName} transaction URL domain.`
                });
            }
        }
        const cleanTransactionId = bankConfig.extractId(rawTxInput);
        if (!cleanTransactionId) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Could not extract a valid transaction ID from input."
            });
        }
        // 2. Prevent reuse of already claimed transaction ID (anti-replay check)
        const [existingRevenue, existingTransaction] = await Promise.all([
            prisma.revenue.findFirst({
                where: {
                    OR: [
                        { id: cleanTransactionId },
                        { id: rawTxInput }
                    ]
                }
            }),
            prisma.transaction.findFirst({
                where: {
                    OR: [
                        { transaction_id: cleanTransactionId },
                        { transaction_id: rawTxInput }
                    ]
                }
            })
        ]);
        if (existingRevenue || existingTransaction) {
            // Trigger duplicate notification to inform the user
            await createNotification({
                userId: user.id,
                type: "security",
                title: "Duplicate Transaction Detected",
                description: `Transaction reference "${cleanTransactionId}" has already been verified or used.`,
                longDetails: `Anti-replay blocked attempt to reuse transaction ID ${cleanTransactionId}. Duplicate transactions are strictly rejected.`
            });
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Duplicate payment transaction! This transaction ID has already been verified or used."
            });
        }
        // 3. Extract and validate actual payment information from the bank receipt
        let payerName = "Verified Customer";
        let actualPaidAmount = null;
        let receiptDateStr = null;
        let receiverNameOnReceipt = null;
        let receiverAccountOnReceipt = null;
        let receiptStatus = null;
        if (paymentPlatform === "AWAS_BANK") {
            let awashReceipt;
            try {
                awashReceipt = await bankConfig.reader({
                    transaction_id: cleanTransactionId,
                    ...(transactionUrl ? { transaction_url: transactionUrl } : {})
                });
            }
            catch (fetchErr) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: fetchErr?.message || "Failed to verify Awash Bank payment receipt. Transaction not found or unreachable."
                });
            }
            if (!awashReceipt || (!awashReceipt.transferredAmount && !awashReceipt.receiverAccount && !awashReceipt.receiverName)) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Failed to verify Awash Bank payment receipt. Transaction details could not be extracted."
                });
            }
            actualPaidAmount = parseNumericAmount(awashReceipt.transferredAmount);
            receiptDateStr = awashReceipt.transactionDate || null;
            receiverNameOnReceipt = awashReceipt.receiverName || null;
            receiverAccountOnReceipt = awashReceipt.receiverAccount || null;
            receiptStatus = awashReceipt.status || null;
            payerName = awashReceipt.senderName || payerName;
        }
        else if (paymentPlatform === "BOA") {
            let boaReceipt;
            try {
                boaReceipt = await bankConfig.reader({
                    transaction_id: cleanTransactionId,
                    ...(transactionUrl ? { transaction_url: transactionUrl } : {})
                });
            }
            catch (fetchErr) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: fetchErr?.message || "Failed to verify Bank of Abyssinia payment receipt."
                });
            }
            if (!boaReceipt || (!boaReceipt.transferredAmount && !boaReceipt.receiverAccount && !boaReceipt.receiverName)) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Failed to verify Bank of Abyssinia payment receipt."
                });
            }
            actualPaidAmount = parseNumericAmount(boaReceipt.transferredAmount);
            receiptDateStr = boaReceipt.transactionDate || null;
            receiverNameOnReceipt = boaReceipt.receiverName || null;
            receiverAccountOnReceipt = boaReceipt.receiverAccount || null;
            receiptStatus = boaReceipt.status || null;
            payerName = boaReceipt.senderName || payerName;
        }
        else {
            // CBE
            let cbeReceipt;
            try {
                cbeReceipt = await bankConfig.reader({
                    transaction_id: cleanTransactionId,
                    ...(transactionUrl ? { transaction_url: transactionUrl } : {})
                });
            }
            catch (fetchErr) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: fetchErr?.message || "Failed to verify Commercial Bank of Ethiopia payment receipt."
                });
            }
            if (!cbeReceipt || !cbeReceipt.success || !cbeReceipt.extractedData) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: cbeReceipt?.error || "Failed to verify transaction receipt with Commercial Bank of Ethiopia."
                });
            }
            if (!cbeReceipt.isVerified) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Receipt reference number does not match the submitted transaction ID."
                });
            }
            actualPaidAmount = parseNumericAmount(cbeReceipt.extractedData.transferredAmount);
            receiptDateStr = cbeReceipt.extractedData.paymentDateTime || null;
            receiverNameOnReceipt = cbeReceipt.extractedData.receiver || null;
            payerName = cbeReceipt.extractedData.payer || payerName;
        }
        // 4. Validate Receipt Conditions
        // 4a. Check transaction status
        if (receiptStatus && /failed|declined|rejected|cancelled/i.test(receiptStatus)) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Transaction status on receipt indicates a failed or incomplete payment."
            });
        }
        // 4b. Actual transaction amount must be greater than 0
        if (!actualPaidAmount || isNaN(actualPaidAmount) || actualPaidAmount <= 0) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Could not extract or verify a valid payment amount from the receipt."
            });
        }
        // 4c. Account holder name matches ACCOUNT_USER_NAME
        const normalizedReceiver = normalizeBankReceiptName(receiverNameOnReceipt);
        const normalizedExpected = normalizeBankReceiptName(config.accountUserName);
        if (normalizedReceiver &&
            !normalizedReceiver.includes(normalizedExpected) &&
            !normalizedExpected.includes(normalizedReceiver)) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: `Payment receiver mismatch. Payment was transferred to "${receiverNameOnReceipt}", expected "${config.accountUserName}".`
            });
        }
        // 4d. Destination account matches ACCOUNT_NUMBER, where available in the receipt
        if (receiverAccountOnReceipt && config.accountNumber) {
            const cleanReceiptAcc = receiverAccountOnReceipt.replace(/[^0-9]/g, "");
            const cleanConfigAcc = config.accountNumber.replace(/[^0-9]/g, "");
            if (cleanReceiptAcc && cleanConfigAcc && !cleanReceiptAcc.includes(cleanConfigAcc) && !cleanConfigAcc.includes(cleanReceiptAcc)) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: `Destination account mismatch. Payment went to "${receiverAccountOnReceipt}", expected "${config.accountNumber}".`
                });
            }
        }
        // 4e. Transaction date is valid according to BEFORE_DATE
        if (config.beforeDate && receiptDateStr) {
            const cutoffDate = parseBankReceiptDate(config.beforeDate);
            const txDate = parseBankReceiptDate(receiptDateStr);
            if (!isNaN(cutoffDate.getTime()) && !isNaN(txDate.getTime())) {
                if (txDate.getTime() < cutoffDate.getTime()) {
                    return res.status(400).json({
                        status: 400,
                        success: false,
                        message: `Transaction date (${txDate.toISOString().slice(0, 10)}) is earlier than allowed cutoff date (${config.beforeDate}).`
                    });
                }
            }
        }
        // 5. Billing calculation: Purchased Requests = Payment Amount / REQUEST_CURRENCY
        const purchasedRequests = Math.floor(Math.round((actualPaidAmount / config.costPerRequest) * 10000) / 10000);
        if (purchasedRequests < 1) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: `Verified payment amount (${actualPaidAmount} ETB) is less than the price of 1 request (${config.costPerRequest} ETB).`
            });
        }
        // 6. Verification confirmed -> Atomically credit requests and save purchase history
        const result = await prisma.$transaction(async (tx) => {
            const revenueRecord = await tx.revenue.create({
                data: {
                    id: cleanTransactionId,
                    user_id: user.id,
                    payer_name: payerName,
                    paid_requests: purchasedRequests,
                    amount: actualPaidAmount,
                    currency: config.currency,
                    status: "verified",
                    method: paymentPlatform,
                    time_stamp: new Date()
                }
            });
            const updatedUser = await tx.users.update({
                where: { id: user.id },
                data: {
                    paid_requests_balance: { increment: purchasedRequests },
                    request_available: { increment: purchasedRequests }
                }
            });
            return { revenueRecord, updatedUser };
        });
        // Trigger success notification
        await createNotification({
            userId: user.id,
            type: "success",
            title: "Requests Purchased Successfully",
            description: `Verified payment of ${actualPaidAmount} ETB. ${purchasedRequests} requests credited to your account.`,
            longDetails: `Payment reference ${cleanTransactionId} verified via ${paymentPlatform}. Rate: ${config.costPerRequest} ETB/req. New purchased balance: ${result.updatedUser.paid_requests_balance}.`
        });
        return res.status(200).json({
            status: 200,
            success: true,
            message: `Successfully verified payment of ${actualPaidAmount} ETB! Added ${purchasedRequests} paid requests.`,
            data: {
                transaction_id: cleanTransactionId,
                requests_credited: purchasedRequests,
                amount_paid: actualPaidAmount,
                currency: config.currency,
                paid_requests_balance: result.updatedUser.paid_requests_balance,
                free_requests_remaining: result.updatedUser.free_requests_remaining,
                total_available: result.updatedUser.request_available
            }
        });
    }
    catch (dbError) {
        return next(dbError);
    }
});
export default router;
//# sourceMappingURL=buy-request.js.map