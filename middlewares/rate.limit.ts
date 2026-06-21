import rateLimit from "express-rate-limit"

export const RateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler: (req, res) => {
        res.json({
            message: `Rate limit hit ${req.ip} is blocked!`
        })
    }
})