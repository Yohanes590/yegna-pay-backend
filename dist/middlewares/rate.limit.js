import rateLimit from 'express-rate-limit';
export const RateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    validate: {
        trustProxy: false,
        keyGeneratorIpFallback: false
    },
    keyGenerator: (req) => {
        const forwardedFor = req?.headers?.['x-forwarded-for'];
        if (typeof forwardedFor === 'string') {
            return forwardedFor.split(',')[0]?.trim() || '';
        }
        if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
            return String(forwardedFor[0]).split(',')[0]?.trim() || '';
        }
        return req?.ip || req?.socket?.remoteAddress || '';
    },
    handler: (req, res) => {
        res.status(429).json({
            message: `Rate limit hit! You are temporarily blocked.`
        });
    }
});
//# sourceMappingURL=rate.limit.js.map