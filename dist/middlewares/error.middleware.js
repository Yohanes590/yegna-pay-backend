import multer from "multer";
import { Prisma } from "@prisma/client";
import { AppError } from "../src/utils/app-error.js";
import { buildErrorResponse } from "../src/utils/error-registry.js";
function isTransactionUniqueTarget(target) {
    if (Array.isArray(target)) {
        return target.some((item) => String(item).toLowerCase().includes("transaction_id"));
    }
    if (typeof target === "string") {
        return target.toLowerCase().includes("transaction_id");
    }
    return false;
}
export function errorMiddleware(err, _req, res, _next) {
    if (res.headersSent) {
        return;
    }
    // 1. Known application / validation errors
    if (err instanceof AppError) {
        if (err.category === "SERVER_ERRORS") {
            console.error("[Server AppError]", err.errorCode, err.cause || err);
        }
        const payload = buildErrorResponse(err.errorKey, {
            status: err.status,
            message: err.message,
            transaction_status: err.transactionStatus,
        });
        return res.status(payload.status).json(payload);
    }
    // 2. Malformed JSON request body
    if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
        const payload = buildErrorResponse("INVALID_REQUEST", {
            message: "Invalid JSON payload",
        });
        return res.status(payload.status).json(payload);
    }
    // 3. Multer multipart upload errors
    if (err instanceof multer.MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE"
            ? "Uploaded receipt image exceeds the 5MB size limit."
            : err.code === "LIMIT_UNEXPECTED_FILE"
                ? 'Unexpected file field. Please upload the receipt image using the "receipt_image" field.'
                : "Invalid receipt image upload.";
        const payload = buildErrorResponse("INVALID_RECEIPT_IMAGE", { message });
        return res.status(payload.status).json(payload);
    }
    // 4. Known Prisma errors (never leak raw Prisma messages or query details)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("[Prisma Known Error]", err.code, err.meta, err.message);
        if (err.code === "P2002") {
            if (isTransactionUniqueTarget(err.meta?.target)) {
                const payload = buildErrorResponse("DUPLICATE_TRANSACTION", {
                    transaction_status: "FAILED",
                });
                return res.status(payload.status).json(payload);
            }
            const payload = buildErrorResponse("INVALID_REQUEST", {
                message: "A record with this unique value already exists.",
            });
            return res.status(payload.status).json(payload);
        }
        if (err.code === "P2025") {
            const payload = buildErrorResponse("PROJECT_NOT_FOUND", {
                message: "Requested record was not found.",
            });
            return res.status(payload.status).json(payload);
        }
        const payload = buildErrorResponse("DATABASE_ERROR");
        return res.status(payload.status).json(payload);
    }
    if (err instanceof Prisma.PrismaClientValidationError ||
        err instanceof Prisma.PrismaClientInitializationError ||
        err instanceof Prisma.PrismaClientUnknownRequestError ||
        err instanceof Prisma.PrismaClientRustPanicError) {
        console.error("[Prisma Error]", err);
        const payload = buildErrorResponse("DATABASE_ERROR");
        return res.status(payload.status).json(payload);
    }
    // 5. Raw PostgreSQL driver errors (pg)
    if (err && typeof err.code === "string" && /^[0-9A-Z]{5}$/.test(err.code)) {
        console.error("[PostgreSQL Error]", err.code, err.detail || err.message);
        if (err.code === "23505" && isTransactionUniqueTarget(err.constraint || err.detail)) {
            const payload = buildErrorResponse("DUPLICATE_TRANSACTION", {
                transaction_status: "FAILED",
            });
            return res.status(payload.status).json(payload);
        }
        const payload = buildErrorResponse("DATABASE_ERROR");
        return res.status(payload.status).json(payload);
    }
    // 6. Fallback unexpected server error (never leak stack, SQL, paths, or secrets)
    console.error("[Unhandled Server Error]", err?.stack || err?.message || err);
    const payload = buildErrorResponse("INTERNAL_SERVER_ERROR");
    return res.status(payload.status).json(payload);
}
//# sourceMappingURL=error.middleware.js.map