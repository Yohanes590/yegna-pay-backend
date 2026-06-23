import rateLimit from 'express-rate-limit'

export const RateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    // Turn off BOTH proxy validation and IPv6 fallback validation checks
    validate: {
        trustProxy: false,
        keyGeneratorIpFallback: false
    },
    // Safely reads the real client IP through proxies or native fallbacks
    keyGenerator: (req: any) => {
        const forwardedFor = req.headers['x-forwarded-for'];
        if (forwardedFor) {
            return forwardedFor.split(',').trim();
        }
        return req.ip || req.socket.remoteAddress || '';
    },
    handler: (req: any, res: any) => {
        res.json({
            message: `Rate limit hit! You are temporarily blocked.`
        })
    }
})