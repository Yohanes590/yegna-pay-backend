import rateLimit from "express-rate-limit";
import { buildErrorResponse } from "../src/utils/error-registry.js";
export const RateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    validate: {
        trustProxy: false,
        keyGeneratorIpFallback: false,
    },
    keyGenerator: (req) => {
        const forwardedFor = req?.headers?.["x-forwarded-for"];
        if (typeof forwardedFor === "string") {
            return forwardedFor.split(",")[0]?.trim() || "";
        }
        if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
            return String(forwardedFor[0]).split(",")[0]?.trim() || "";
        }
        return req?.ip || req?.socket?.remoteAddress || "";
    },
    handler: (_req, res) => {
        const payload = buildErrorResponse("RATE_LIMIT_EXCEEDED", {
            message: "Rate limit hit! You are temporarily blocked.",
        });
        res.status(payload.status).json(payload);
    },
});
//# sourceMappingURL=rate.limit.js.map