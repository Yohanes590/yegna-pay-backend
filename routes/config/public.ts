import { Router } from "express";
import { getBillingConfig } from "../../lib/billing-config.js";
import { listEnabledBanks } from "../../modules/verification/bank.registry.js";

const router = Router();

router.get("/", (_req, res) => {
    const config = getBillingConfig();
    const banks = listEnabledBanks().map((b) => ({
        name: b.name,
        platform: b.platform,
        link_readable: b.link_readable,
    }));
    return res.status(200).json({
        status: 200,
        success: true,
        request_currency: config.costPerRequest,
        cost_per_request: config.costPerRequest,
        currency: config.currency,
        free_requests: config.freeRequests,
        banks,
    });
});

export default router;
