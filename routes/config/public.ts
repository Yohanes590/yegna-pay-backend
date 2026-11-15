import { Router } from "express";
import { getBillingConfig } from "../../lib/billing-config.js";

const router = Router();

router.get("/", (_req, res) => {
    const config = getBillingConfig();
    return res.status(200).json({
        status: 200,
        success: true,
        request_currency: config.costPerRequest,
        cost_per_request: config.costPerRequest,
        currency: config.currency,
        free_requests: config.freeRequests,
    });
});

export default router;
