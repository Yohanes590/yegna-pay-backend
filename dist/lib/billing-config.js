import "dotenv/config";
export function getBillingConfig() {
    const rawCost = process.env.REQUEST_CURRENCY || "0.5";
    const costPerRequest = parseFloat(rawCost.replace(/[^0-9.]/g, "")) || 0.5;
    const rawFree = process.env.FREE_REQUESTS || "200";
    const freeRequests = parseInt(rawFree.replace(/[^0-9]/g, ""), 10) || 200;
    const accountUserName = (process.env.ACCOUNT_USER_NAME || "YOHANES MULUGETA KASSAW").replace(/^['"]|['"]$/g, "").trim();
    const billingMethod = (process.env.BILLING_METHOD || "AWAS_BANK").replace(/^['"]|['"]$/g, "").trim();
    const accountNumber = (process.env.ACCOUNT_NUMBER || "013201568261800").replace(/^['"]|['"]$/g, "").trim();
    const beforeDate = (process.env.BEFORE_DATE || "11/15/2026").replace(/^['"]|['"]$/g, "").trim();
    return {
        costPerRequest,
        freeRequests,
        accountUserName,
        billingMethod,
        accountNumber,
        beforeDate,
        currency: "ETB"
    };
}
//# sourceMappingURL=billing-config.js.map