import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { VerifyToken } from "../../lib/JWT-generate.js";
import { prisma } from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import { getBillingConfig } from "../../lib/billing-config.js";
import { getBankConfig, normalizeBankIdentifier } from "../../lib/bank-registry.js";
import { extractCleanTransactionId } from "../../lib/cbe-domain.js";

const router = Router();

function normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, " ");
}

async function resolveAuthenticatedUser(req: any) {
    const authHeader = req.headers.authorization;
    const clientToken = req.body?.token || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader);
    let userEmail: string | null = null;
    let userId: string | null = null;

    if (clientToken && typeof clientToken === "string" && clientToken.trim() !== "") {
        const decoded = VerifyToken(clientToken);
        if (decoded.status === 200 && decoded.message?.email) {
            userEmail = decoded.message.email;
            userId = decoded.message.id;
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
        } catch {
            // session check failed
        }
    }

    if (!userEmail) return null;

    let user = await prisma.users.findUnique({
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
router.get("/", async (req, res) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({
                status: 401,
                success: false,
                message: "Unauthorized. Please sign in to view billing."
            });
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
    } catch (err: any) {
        console.error("Fetch billing error:", err?.message || err);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Failed to retrieve billing information."
        });
    }
});

// POST /user/buy-request - Purchase additional verification requests
router.post("/", async (req, res) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({
                status: 401,
                success: false,
                message: "Unauthorized user! Please log in."
            });
        }

        const { requestAmount, transaction_id, platform } = req.body;

        // 1. Validate requestAmount
        const count = parseInt(String(requestAmount), 10);
        if (isNaN(count) || count < 1) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Invalid request amount. Minimum purchase is 1 request."
            });
        }

        // 2. Validate transaction reference & calculate pricing
        if (!transaction_id || typeof transaction_id !== "string" || transaction_id.trim() === "") {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Transaction reference or receipt link is required."
            });
        }

        const config = getBillingConfig();
        const expectedPrice = Number((count * config.costPerRequest).toFixed(2));
        const bankConfig = getBankConfig(platform || config.billingMethod);
        const paymentPlatform = bankConfig.identifier;

        const rawTxInput = transaction_id.trim();
        let transactionUrl = "";

        if (rawTxInput.startsWith("http://") || rawTxInput.startsWith("https://")) {
            try {
                const { fullUrl } = bankConfig.validateUrl(rawTxInput);
                transactionUrl = fullUrl;
            } catch (err: any) {
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

        // 3. Prevent reuse of already claimed transaction ID (anti-replay check)
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
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Duplicate payment transaction! This transaction ID has already been claimed."
            });
        }

        // 4. Verify actual payment transaction against dynamic banking rails
        let payerName = "Verified Customer";

        if (paymentPlatform === "AWAS_BANK") {
            const awashReceipt = await bankConfig.reader({
                transaction_id: cleanTransactionId,
                ...(transactionUrl ? { transaction_url: transactionUrl } : {})
            });
            if (!awashReceipt || !awashReceipt.receiverAccount) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Failed to verify Awash Bank payment receipt. Transaction not found."
                });
            }

            const cleanTransferred = Number(String(awashReceipt.transferredAmount).replace(/[^0-9.]/g, ""));
            if (cleanTransferred < expectedPrice) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: `Transferred amount (${cleanTransferred} ETB) is less than required (${expectedPrice} ETB for ${count} requests).`
                });
            }

            payerName = awashReceipt.senderName || awashReceipt.receiverName || payerName;

        } else if (paymentPlatform === "BOA") {
            const boaReceipt = await bankConfig.reader({
                transaction_id: cleanTransactionId,
                ...(transactionUrl ? { transaction_url: transactionUrl } : {})
            });
            if (!boaReceipt || !boaReceipt.receiverAccount) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Failed to verify Bank of Abyssinia payment receipt. Transaction not found."
                });
            }

            const cleanTransferred = Number(String(boaReceipt.transferredAmount).replace(/[^0-9.]/g, ""));
            if (cleanTransferred < expectedPrice) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: `Transferred amount (${cleanTransferred} ETB) is less than required (${expectedPrice} ETB for ${count} requests).`
                });
            }

            payerName = boaReceipt.senderName || boaReceipt.receiverName || payerName;

        } else {
            // Default to Commercial Bank of Ethiopia (CBE)
            const ReadingReceipt = await bankConfig.reader({
                transaction_id: cleanTransactionId,
                ...(transactionUrl ? { transaction_url: transactionUrl } : {})
            });

            if (!ReadingReceipt || !ReadingReceipt.success || !ReadingReceipt.extractedData) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: ReadingReceipt?.error || "Failed to verify transaction receipt with Commercial Bank of Ethiopia."
                });
            }

            if (!ReadingReceipt.isVerified) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Receipt reference number does not match the submitted transaction ID."
                });
            }

            const receiverOnReceipt = normalizeName(ReadingReceipt.extractedData.receiver || "");
            const configuredAccountName = normalizeName(config.accountUserName);

            if (!receiverOnReceipt.includes(configuredAccountName) && !configuredAccountName.includes(receiverOnReceipt)) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: `Payment receiver mismatch. Payment was transferred to "${ReadingReceipt.extractedData.receiver}", expected "${config.accountUserName}".`
                });
            }

            const cleanTransferred = Number(String(ReadingReceipt.extractedData.transferredAmount).replace(/[^0-9.]/g, ""));
            if (cleanTransferred < expectedPrice) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: `Transferred amount (${cleanTransferred} ETB) is less than required (${expectedPrice} ETB for ${count} requests).`
                });
            }

            payerName = ReadingReceipt.extractedData.payer || payerName;
        }

        // 6. Verification confirmed -> Atomically credit requests and save purchase history
        const result = await prisma.$transaction(async (tx) => {
            const revenueRecord = await tx.revenue.create({
                data: {
                    id: cleanTransactionId,
                    user_id: user.id,
                    payer_name: payerName,
                    paid_requests: count,
                    amount: expectedPrice,
                    currency: config.currency,
                    status: "verified",
                    method: paymentPlatform,
                    time_stamp: new Date()
                }
            });

            const updatedUser = await tx.users.update({
                where: { id: user.id },
                data: {
                    paid_requests_balance: { increment: count },
                    request_available: { increment: count }
                }
            });

            return { revenueRecord, updatedUser };
        });

        return res.status(200).json({
            status: 200,
            success: true,
            message: `Successfully purchased ${count} verification requests!`,
            data: {
                transaction_id: cleanTransactionId,
                requests_credited: count,
                amount_paid: expectedPrice,
                currency: config.currency,
                paid_requests_balance: result.updatedUser.paid_requests_balance,
                free_requests_remaining: result.updatedUser.free_requests_remaining,
                total_available: result.updatedUser.request_available
            }
        });

    } catch (dbError: any) {
        console.error("Purchase processing error:", dbError);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Internal server error processing credit purchase.",
            error_details: dbError.message
        });
    }
});

export default router;
