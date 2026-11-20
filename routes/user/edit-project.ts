import { Router, type NextFunction, type Request, type Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { resolveAuthenticatedUserId } from "../../lib/resolve-session-user.js";
import { normalizeProjectEligibilityDate } from "../../service/bank-features/unified-bank-check.js";
import { buildErrorResponse } from "../../src/utils/error-registry.js";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    const { updatedData, id } = req.body;
    const resolvedUserId = await resolveAuthenticatedUserId(req);

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
    } catch (err: any) {
        return next(err);
    }
});

export default router;
