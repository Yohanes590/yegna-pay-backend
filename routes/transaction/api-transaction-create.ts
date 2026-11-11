import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { ProjectAPIKey } from "../../service/ProjectAPICheck.js";
import { SendWebHook } from "../../service/webhook-sender.js";
import { TransactionLogSaved } from "../../service/transaction-services/transaction-log.js";
import { TransactionIDCheck } from "../../service/transaction-services/transaction-id-check.js";
import { UserRequestAmount, deductUserRequestCredit } from "../../lib/request-checker.js";
import { UserIdFinder } from "../../lib/user-id-picker.js";
import { resolveBankAndTransaction, tryResolveExplicitBank } from "../../lib/bank-resolver.js";
import {
    ALLOWED_RECEIPT_IMAGE_MIMES,
    MAX_RECEIPT_IMAGE_BYTES,
    extractQrContentFromImage,
} from "../../lib/qr-extractor.js";
import { persistQrReceiptImageAttempt } from "../../service/qr-image-service.js";
import {
    fetchAndNormalizeBankReceipt,
    verifyAndSaveBankTransaction,
} from "../../service/bank-features/unified-bank-check.js";

const router = Router();

const receiptUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_RECEIPT_IMAGE_BYTES,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_RECEIPT_IMAGE_MIMES.has((file.mimetype || "").toLowerCase())) {
            cb(new Error("Unsupported image format. Please upload a PNG, JPG, or JPEG receipt image."));
            return;
        }
        cb(null, true);
    },
});

function handleOptionalReceiptUpload(req: Request, res: Response, next: NextFunction) {
    if (!req.is("multipart/form-data")) {
        return next();
    }

    receiptUpload.single("receipt_image")(req, res, (err: any) => {
        if (err) {
            const message =
                err?.code === "LIMIT_FILE_SIZE"
                    ? "Uploaded receipt image exceeds the 5MB size limit."
                    : err?.code === "LIMIT_UNEXPECTED_FILE"
                    ? 'Unexpected file field. Please upload the receipt image using the "receipt_image" field.'
                    : err?.message || "Invalid receipt image upload.";
            return res.status(400).json({
                status: 400,
                success: false,
                message,
            });
        }
        return next();
    });
}

router.post("/", handleOptionalReceiptUpload, async (req, res) => {
    // 1. Guard against missing or empty payloads (allow multipart when fields/file were parsed)
    const hasBody = Boolean(req.body && typeof req.body === "object" && Object.keys(req.body).length > 0);
    if (!hasBody && !req.file) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: "Request body is missing or empty. Please provide a valid JSON body or multipart form data."
        });
    }

    // 2. Extract authorization header or API key
    const authHeader = req.headers.authorization;
    const APIkey = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : (authHeader || req.body?.api_key || req.headers["x-api-key"] as string);

    // 3. Safely extract body fields
    const {
        price_amount,
        full_name = "",
        platform: rawPlatform,
        transaction_id: rawTransactionId,
        transaction_url: rawTransactionUrl,
        currency = "ETB"
    } = req.body || {};

    // 4. Validate price_amount
    if (
        price_amount === undefined ||
        price_amount === null ||
        price_amount === "" ||
        isNaN(Number(price_amount)) ||
        Number(price_amount) <= 0
    ) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: "Missing or invalid required field: price_amount. Must be a positive number."
        });
    }

    const recordQrAttempt = async (attempt: {
        projectId?: string | null;
        status: "VERIFIED" | "FAILED";
        bankName: string;
        extractedTransactionId?: string | null;
        qrContent?: string | null;
        transactionAmount?: number | null;
        currency?: string;
        receiptDate?: string | null;
        failureReason?: string | null;
        verifiedAt?: Date | null;
    }) => {
        if (!req.file) return null;
        try {
            let resolvedProjectId = attempt.projectId || null;
            if (!resolvedProjectId && APIkey && typeof APIkey === "string" && APIkey.trim() !== "") {
                const proj = await prisma.projects.findFirst({
                    where: { api_sec_key: APIkey },
                    select: { id: true },
                });
                resolvedProjectId = proj?.id || null;
            }
            if (!resolvedProjectId) return null;

            return await persistQrReceiptImageAttempt({
                file: req.file,
                projectId: resolvedProjectId,
                status: attempt.status,
                bankName: attempt.bankName,
                extractedTransactionId: attempt.extractedTransactionId ?? null,
                qrContent: attempt.qrContent ?? null,
                transactionAmount: attempt.transactionAmount ?? null,
                currency: attempt.currency || "ETB",
                receiptDate: attempt.receiptDate ?? null,
                failureReason: attempt.failureReason ?? null,
                verifiedAt: attempt.verifiedAt ?? null,
            });
        } catch (err: any) {
            console.error("Failed to record QR receipt image attempt:", err?.message || err);
            return null;
        }
    };

    const inferredPreBank =
        tryResolveExplicitBank(typeof currency === "string" ? currency : "") ||
        tryResolveExplicitBank(typeof rawPlatform === "string" ? rawPlatform : "") ||
        "UNKNOWN";

    // 4b. Option B: If a receipt_image file was uploaded, decode its QR code and use it as transaction_id
    let effectiveTransactionId = rawTransactionId;
    let effectiveTransactionUrl = rawTransactionUrl;

    if (req.file) {
        const qrResult = await extractQrContentFromImage(req.file.buffer, req.file.mimetype);
        if (!qrResult.ok) {
            await recordQrAttempt({
                status: "FAILED",
                bankName: inferredPreBank,
                transactionAmount: Number(price_amount),
                failureReason: qrResult.message,
            });
            return res.status(400).json({
                status: 400,
                success: false,
                message: qrResult.message,
            });
        }
        effectiveTransactionId = qrResult.content;
        effectiveTransactionUrl = undefined;
    }

    // 5. Resolve target bank, validate domain if a URL was provided, and extract clean transaction ID
    const resolvedBank = resolveBankAndTransaction({
        platform: rawPlatform,
        currency,
        rawTransactionId: effectiveTransactionId,
        rawTransactionUrl: effectiveTransactionUrl,
    });

    if (!resolvedBank.ok) {
        if (req.file) {
            await recordQrAttempt({
                status: "FAILED",
                bankName: inferredPreBank,
                qrContent: typeof effectiveTransactionId === "string" ? effectiveTransactionId : null,
                transactionAmount: Number(price_amount),
                failureReason: resolvedBank.message,
            });
        }
        return res.status(400).json({
            status: 400,
            success: false,
            message: resolvedBank.message,
        });
    }

    const {
        bankCode: finalPlatform,
        bankConfig,
        transactionId: finalTransactionId,
        transactionUrl: finalTransactionUrl,
        storedCurrency,
    } = resolvedBank;

    // 6. Validate API Key
    if (!APIkey || typeof APIkey !== "string" || APIkey.trim() === "") {
        return res.status(401).json({
            status: 401,
            success: false,
            message: "UNAUTHORIZED ACCESS! Missing API Key."
        });
    }

    try {
        const APICheck = await ProjectAPIKey(APIkey);
        if (!APICheck.success) {
            return res.status(401).json({
                status: 401,
                success: false,
                message: APICheck.message || "Invalid API Key."
            });
        }

        const userStatusCheck = await prisma.projects.findFirst({
            where: { api_sec_key: APIkey },
            include: { user: true }
        });

        if (!userStatusCheck) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: "Associated project not found for the provided API key."
            });
        }

        if (userStatusCheck.user?.account_status !== "active") {
            return res.status(401).json({
                status: 401,
                success: false,
                message: "This account has been banned. Please contact support."
            });
        }

        const transactionIdChecker = await TransactionIDCheck(finalTransactionId);
        if (transactionIdChecker.status === false) {
            const LoggedData = {
                transaction_id: finalTransactionId,
                event: "DUPLICATED TRANSACTION ID",
                message: "Duplicated transaction ID Detected",
                transaction_status: "failed",
                transaction_bank: finalPlatform
            };

            await TransactionLogSaved(LoggedData);
            await recordQrAttempt({
                projectId: userStatusCheck.id,
                status: "FAILED",
                bankName: finalPlatform,
                extractedTransactionId: finalTransactionId,
                qrContent: typeof effectiveTransactionId === "string" ? effectiveTransactionId : null,
                transactionAmount: Number(price_amount),
                currency: storedCurrency,
                failureReason: "Duplicate transaction ID detected.",
            });
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Duplicate transaction ID detected."
            });
        }

        // 7. Check user request quota using the same CBE reference pipeline for every supported bank
        const userIdExtractor: any = await UserIdFinder(APIkey);
        if (!userIdExtractor || !userIdExtractor.data) {
            await recordQrAttempt({
                projectId: userStatusCheck.id,
                status: "FAILED",
                bankName: finalPlatform,
                extractedTransactionId: finalTransactionId,
                qrContent: typeof effectiveTransactionId === "string" ? effectiveTransactionId : null,
                transactionAmount: Number(price_amount),
                currency: storedCurrency,
                failureReason: "User ID not found",
            });
            return res.status(400).json({
                status: 400,
                success: false,
                message: "User ID not found",
            });
        }

        const userReqAmount = await UserRequestAmount(userIdExtractor.data);
        if (!userReqAmount.success) {
            await recordQrAttempt({
                projectId: userStatusCheck.id,
                status: "FAILED",
                bankName: finalPlatform,
                extractedTransactionId: finalTransactionId,
                qrContent: typeof effectiveTransactionId === "string" ? effectiveTransactionId : null,
                transactionAmount: Number(price_amount),
                currency: storedCurrency,
                failureReason: userReqAmount.message || "Insufficient request quota.",
            });
            return res.status(400).json({
                status: 400,
                success: false,
                message: userReqAmount.message,
            });
        }

        // 8. Fetch and validate the receipt via the selected bank's reading function
        const receiptOutcome = await fetchAndNormalizeBankReceipt(
            finalPlatform,
            bankConfig,
            finalTransactionId,
            finalTransactionUrl || undefined
        );

        if (!receiptOutcome.ok) {
            await recordQrAttempt({
                projectId: userStatusCheck.id,
                status: "FAILED",
                bankName: finalPlatform,
                extractedTransactionId: finalTransactionId,
                qrContent: typeof effectiveTransactionId === "string" ? effectiveTransactionId : null,
                transactionAmount: Number(price_amount),
                currency: storedCurrency,
                failureReason: receiptOutcome.message,
            });
            return res.status(400).json({
                status: 400,
                success: false,
                transaction_status: receiptOutcome.transaction_status,
                message: receiptOutcome.message,
            });
        }

        // 9. Verify recipient, amount, date restriction, and persist transaction uniformly
        const verificationResponse = await verifyAndSaveBankTransaction({
            bankCode: finalPlatform,
            receipt: receiptOutcome.receipt,
            expectedReceiverName: userStatusCheck.receiver_name,
            requestedPriceAmount: price_amount,
            projectDateRestriction: userStatusCheck.before_expires,
            transactionId: finalTransactionId,
            projectId: userStatusCheck.id,
            currency: storedCurrency,
        });

        if (!verificationResponse.success) {
            await recordQrAttempt({
                projectId: userStatusCheck.id,
                status: "FAILED",
                bankName: finalPlatform,
                extractedTransactionId: finalTransactionId,
                qrContent: typeof effectiveTransactionId === "string" ? effectiveTransactionId : null,
                transactionAmount: Number(price_amount),
                currency: storedCurrency,
                receiptDate: receiptOutcome.receipt.paymentDateTime || null,
                failureReason: verificationResponse.message,
            });
            return res.status(400).json({
                status: 400,
                success: false,
                transaction_status: verificationResponse.status || "FAILED",
                message: verificationResponse.message,
                data: verificationResponse.data,
            });
        }

        const deductResult = await deductUserRequestCredit(userIdExtractor.data);
        if (!deductResult.success) {
            await recordQrAttempt({
                projectId: userStatusCheck.id,
                status: "FAILED",
                bankName: finalPlatform,
                extractedTransactionId: finalTransactionId,
                qrContent: typeof effectiveTransactionId === "string" ? effectiveTransactionId : null,
                transactionAmount: Number(price_amount),
                currency: storedCurrency,
                receiptDate: receiptOutcome.receipt.paymentDateTime || null,
                failureReason: deductResult.message || "Insufficient verification quota.",
            });
            return res.status(402).json({
                status: 402,
                success: false,
                transaction_status: "FAILED",
                message: deductResult.message || "Insufficient verification quota.",
            });
        }

        let receiptImageUrl: string | undefined;
        let responseData = verificationResponse.data;

        if (req.file) {
            const savedQrImage = await recordQrAttempt({
                projectId: userStatusCheck.id,
                status: "VERIFIED",
                bankName: finalPlatform,
                extractedTransactionId: finalTransactionId,
                qrContent: typeof effectiveTransactionId === "string" ? effectiveTransactionId : null,
                transactionAmount:
                    verificationResponse.data?.transaction_amount ?? Number(price_amount),
                currency: storedCurrency,
                receiptDate: receiptOutcome.receipt.paymentDateTime || null,
                verifiedAt: new Date(),
            });
            if (savedQrImage?.imageUrl) {
                receiptImageUrl = savedQrImage.imageUrl;
                responseData = {
                    ...(verificationResponse.data || {}),
                    receipt_image_url: receiptImageUrl,
                };
            }
        }

        const webhook = userStatusCheck.call_back_url;
        if (webhook) {
            SendWebHook(webhook, responseData);
        }

        await TransactionLogSaved({
            transaction_id: finalTransactionId,
            event: "TRANSACTION COMPLETED!",
            message: receiptImageUrl
                ? `Transaction created successfully [receipt_image: ${receiptImageUrl}]`
                : "Transaction created successfully",
            transaction_status: "success",
            transaction_bank: finalPlatform,
        });

        return res.status(200).json({
            status: 200,
            success: true,
            transaction_status: "VERIFIED",
            message: verificationResponse.message,
            ...(receiptImageUrl ? { receipt_image_url: receiptImageUrl } : {}),
            data: responseData,
        });

    } catch (error: any) {
        console.error("Transaction create error:", error?.message || error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Internal server error 500",
            error: error.message
        });
    }
});

export default router;
