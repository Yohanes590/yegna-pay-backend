import { Router, type NextFunction, type Request, type Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { VerifyToken } from "../../lib/JWT-generate.js";
import { prisma } from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import { normalizeProjectEligibilityDate } from "../../service/bank-features/unified-bank-check.js";
import { buildErrorResponse } from "../../src/utils/error-registry.js";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.body;
    const project_name = req.body.project_name;
    const api_sec = req.body.api_sec || req.body.apiKey;
    const webcall_back = req.body.webcall_back || req.body.call_back || "";
    const project_discription = req.body.project_discription || req.body.discription || "";
    const rawEligibilityDate =
        req.body.transaction_start_date ??
        req.body.eligibility_start_date ??
        req.body.before_expires ??
        req.body.expiresDate ??
        req.body.date_expire ??
        "";
    const paymentReceiverName = req.body.paymentReceiverName || req.body.receiver_name || "";
    const detailVerification =
        req.body.detail_verification !== undefined
            ? Boolean(req.body.detail_verification)
            : req.body.detailVerification !== undefined
            ? Boolean(req.body.detailVerification)
            : true;

    if (!project_name || !api_sec) {
        const errPayload = buildErrorResponse("MISSING_REQUIRED_FIELD", {
            message: "Please fill in all required credentials!",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    if (detailVerification && !paymentReceiverName) {
        const errPayload = buildErrorResponse("MISSING_REQUIRED_FIELD", {
            message: "Payment receiver name is required when detailed verification is enabled.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    let expiresDate: string | null = null;
    if (detailVerification) {
        const normalizedDate = normalizeProjectEligibilityDate(
            typeof rawEligibilityDate === "string" ? rawEligibilityDate : ""
        );
        if (!normalizedDate.valid) {
            const errPayload = buildErrorResponse("INVALID_DATE_RANGE", {
                message: "Invalid transaction eligibility start date. Please provide a valid date (YYYY-MM-DD).",
            });
            return res.status(errPayload.status).json(errPayload);
        }
        expiresDate = normalizedDate.normalized;
    } else if (typeof rawEligibilityDate === "string" && rawEligibilityDate.trim() !== "") {
        const normalizedDate = normalizeProjectEligibilityDate(rawEligibilityDate);
        if (normalizedDate.valid) {
            expiresDate = normalizedDate.normalized;
        }
    }

    let resolvedUserId: string | null = null;

    // 1. Verify via token
    if (token && typeof token === "string" && token.trim() !== "") {
        const decode = VerifyToken(token);
        if (decode.status === 200 && decode.message?.id) {
            resolvedUserId = decode.message.id;
        }
    }

    // 2. Fallback to Better Auth session cookies
    if (!resolvedUserId) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers)
            });
            if (session?.user?.email) {
                const dbUser = await prisma.users.findUnique({
                    where: { email: session.user.email }
                });
                if (dbUser?.id) {
                    resolvedUserId = dbUser.id;
                }
            }
        } catch {
            // session check failed
        }
    }

    if (!resolvedUserId) {
        const errPayload = buildErrorResponse("UNAUTHORIZED", {
            message: "Unauthorized token. Please sign in again.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    try {
        await prisma.projects.create({
            data: {
                project_name: project_name,
                api_sec_key: api_sec,
                call_back_url: webcall_back,
                project_description: project_discription,
                ProjectBalance: "0.00 ETB",
                before_expires: expiresDate,
                receiver_name: paymentReceiverName || null,
                detail_verification: detailVerification,
                user: {
                    connect: {
                        id: resolvedUserId,
                    },
                },
            },
        });
        return res.status(200).json({
            status: 200,
            success: true,
            message: "Project created successfully"
        });
    } catch (err: any) {
        return next(err);
    }
});

export default router;
