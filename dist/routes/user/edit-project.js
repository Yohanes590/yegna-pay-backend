import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { prisma } from "../../lib/prisma.js";
import { VerifyToken } from "../../lib/JWT-generate.js";
import { auth } from "../../lib/auth.js";
import { normalizeProjectEligibilityDate } from "../../service/bank-features/unified-bank-check.js";
import { buildErrorResponse } from "../../src/utils/error-registry.js";
const router = Router();
router.post("/", async (req, res, next) => {
    const { token, updatedData, id } = req.body;
    let resolvedUserId = null;
    if (token && typeof token === "string" && token.trim() !== "") {
        const decode = VerifyToken(token);
        if (decode.status === 200 && decode.message?.id) {
            resolvedUserId = decode.message.id;
        }
    }
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
        }
        catch {
            // session check failed
        }
    }
    if (!resolvedUserId) {
        const errPayload = buildErrorResponse("UNAUTHORIZED", {
            message: "Unauthorized token. Please sign in again.",
        });
        return res.status(errPayload.status).json(errPayload);
    }
    if (!updatedData || typeof updatedData !== "object") {
        const errPayload = buildErrorResponse("INVALID_REQUEST", {
            message: "Invalid update payload.",
        });
        return res.status(errPayload.status).json(errPayload);
    }
    const sanitizedUpdate = { ...updatedData };
    const candidateDate = sanitizedUpdate.transaction_start_date ?? sanitizedUpdate.before_expires;
    if (candidateDate !== undefined) {
        delete sanitizedUpdate.transaction_start_date;
        if (typeof candidateDate === "string" && candidateDate.trim() !== "") {
            const parsed = normalizeProjectEligibilityDate(candidateDate);
            if (!parsed.valid) {
                const errPayload = buildErrorResponse("INVALID_DATE_RANGE", {
                    message: "Invalid transaction eligibility start date. Please provide a valid date (YYYY-MM-DD).",
                });
                return res.status(errPayload.status).json(errPayload);
            }
            sanitizedUpdate.before_expires = parsed.normalized;
        }
    }
    try {
        await prisma.projects.update({
            where: { id },
            data: sanitizedUpdate,
        });
        return res.status(200).json({
            success: true,
            message: "Project successfully updated",
        });
    }
    catch (err) {
        return next(err);
    }
});
export default router;
//# sourceMappingURL=edit-project.js.map