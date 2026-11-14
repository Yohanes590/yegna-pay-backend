import fs from "node:fs";
import path from "node:path";
import { Router, type NextFunction, type Request, type Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { prisma } from "../../lib/prisma.js";
import { VerifyToken } from "../../lib/JWT-generate.js";
import { auth } from "../../lib/auth.js";
import { QR_RECEIPT_UPLOAD_DIR } from "../../service/qr-image-service.js";
import { buildErrorResponse } from "../../src/utils/error-registry.js";

const router = Router();

function parseCookieValue(cookieHeader: string | undefined, key: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(";")) {
        const idx = part.indexOf("=");
        if (idx === -1) continue;
        const name = part.slice(0, idx).trim();
        if (name === key) {
            return decodeURIComponent(part.slice(idx + 1).trim());
        }
    }
    return null;
}

async function resolveAuthenticatedUserId(req: Request): Promise<string | null> {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const cookieToken = parseCookieValue(req.headers.cookie, "access_token");
    const queryToken = typeof req.query.token === "string" ? req.query.token.trim() : null;

    const jwtCandidate = bearerToken || queryToken || cookieToken;
    if (jwtCandidate) {
        const decoded = VerifyToken(jwtCandidate);
        if (decoded.status === 200 && decoded.message?.id) {
            return decoded.message.id;
        }
    }

    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });
        if (session?.user?.email) {
            const dbUser = await prisma.users.findUnique({
                where: { email: session.user.email },
                select: { id: true },
            });
            if (dbUser?.id) {
                return dbUser.id;
            }
        }
    } catch {
        // Better Auth session lookup failed or absent
    }

    return null;
}

// GET /qr-images/project/:projectId?status=VERIFIED|FAILED&page=1&limit=12&search=
router.get("/project/:projectId", async (req: Request, res: Response, next: NextFunction) => {
    try {
    const userId = await resolveAuthenticatedUserId(req);
    if (!userId) {
        const errPayload = buildErrorResponse("UNAUTHORIZED", {
            message: "Unauthorized. Please sign in to access project QR images.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    const projectId = String(req.params.projectId || "").trim();
    if (!projectId) {
        const errPayload = buildErrorResponse("MISSING_REQUIRED_FIELD", {
            message: "Missing projectId parameter.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    // Strict backend project ownership check: never expose another project's QR images
    const ownedProject = await prisma.projects.findFirst({
        where: { id: projectId, user_Id: userId },
        select: { id: true, project_name: true },
    });

    if (!ownedProject) {
        const errPayload = buildErrorResponse("FORBIDDEN", {
            message: "Access denied. You do not have permission to view QR images for this project.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    const rawStatus = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const statusFilter = rawStatus === "VERIFIED" || rawStatus === "FAILED" ? rawStatus : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "12"), 10) || 12));
    const skip = (page - 1) * limit;

    const baseWhere: any = { projectId: ownedProject.id };
    if (search) {
        baseWhere.OR = [
            { extractedTransactionId: { contains: search, mode: "insensitive" } },
            { bankName: { contains: search, mode: "insensitive" } },
            { failureReason: { contains: search, mode: "insensitive" } },
        ];
    }

    const filteredWhere = statusFilter ? { ...baseWhere, status: statusFilter } : baseWhere;

    try {
        const [items, total, verifiedCount, failedCount] = await Promise.all([
            prisma.qrReceiptImage.findMany({
                where: filteredWhere,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                select: {
                    id: true,
                    projectId: true,
                    imageUrl: true,
                    mimeType: true,
                    status: true,
                    extractedTransactionId: true,
                    qrContent: true,
                    transactionAmount: true,
                    currency: true,
                    bankName: true,
                    receiptDate: true,
                    failureReason: true,
                    verifiedAt: true,
                    createdAt: true,
                },
            }),
            prisma.qrReceiptImage.count({ where: filteredWhere }),
            prisma.qrReceiptImage.count({ where: { projectId: ownedProject.id, status: "VERIFIED" } }),
            prisma.qrReceiptImage.count({ where: { projectId: ownedProject.id, status: "FAILED" } }),
        ]);

        return res.status(200).json({
            status: 200,
            success: true,
            projectId: ownedProject.id,
            items: items.map((item) => ({
                ...item,
                transactionAmount:
                    item.transactionAmount !== null && item.transactionAmount !== undefined
                        ? Number(item.transactionAmount)
                        : null,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
            counts: {
                verified: verifiedCount,
                failed: failedCount,
                all: verifiedCount + failedCount,
            },
        });
    } catch (err: any) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: err?.message || "Failed to retrieve project QR images.",
        });
    }
    } catch (err) {
        return next(err);
    }
});

// GET /qr-images/file/:imageId (serves locally preserved fallback images with strict project ownership check)
router.get("/file/:imageId", async (req: Request, res: Response, next: NextFunction) => {
    try {
    const userId = await resolveAuthenticatedUserId(req);
    if (!userId) {
        const errPayload = buildErrorResponse("UNAUTHORIZED", {
            message: "Unauthorized access.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    const imageId = String(req.params.imageId || "").trim();
    if (!imageId) {
        const errPayload = buildErrorResponse("MISSING_REQUIRED_FIELD", {
            message: "Missing image ID.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    const record = await prisma.qrReceiptImage.findFirst({
        where: {
            id: imageId,
            projects: { user_Id: userId },
        },
        select: {
            id: true,
            imageUrl: true,
            localFilePath: true,
            mimeType: true,
        },
    });

    if (!record) {
        const errPayload = buildErrorResponse("PROJECT_NOT_FOUND", {
            message: "Receipt image not found or access denied.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    if (record.localFilePath) {
        const safeName = path.basename(record.localFilePath);
        const absolutePath = path.join(QR_RECEIPT_UPLOAD_DIR, safeName);
        if (fs.existsSync(absolutePath)) {
            res.setHeader("Content-Type", record.mimeType || "image/png");
            res.setHeader("Cache-Control", "private, max-age=3600");
            return fs.createReadStream(absolutePath).pipe(res);
        }
    }

    if (record.imageUrl && (record.imageUrl.startsWith("http://") || record.imageUrl.startsWith("https://"))) {
        return res.redirect(record.imageUrl);
    }

    const errPayload = buildErrorResponse("PROJECT_NOT_FOUND", {
        message: "Original receipt image file could not be located.",
    });
    return res.status(errPayload.status).json(errPayload);
    } catch (err) {
        return next(err);
    }
});

export default router;

