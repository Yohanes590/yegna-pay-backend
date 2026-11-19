import { getRuntimeBankByRegistryId } from "./bank.registry.js";
import { verificationLog } from "./structured-logger.js";
const REGISTRY_TO_CODE = {
    CBE: "CBE",
    AWAS_BANK: "AWASH",
    BOA: "BOA",
};
export function bankCodeFromConfig(bankConfig) {
    return REGISTRY_TO_CODE[bankConfig.identifier];
}
export async function fetchAndNormalizeViaAdapter(bankConfig, transactionId, transactionUrl) {
    const runtime = getRuntimeBankByRegistryId(bankConfig.identifier);
    if (!runtime.entry.enabled) {
        return {
            ok: false,
            transaction_status: "FAILED",
            message: `${runtime.entry.name} integration is temporarily disabled.`,
        };
    }
    let raw;
    try {
        raw = await bankConfig.reader({
            transaction_id: transactionId,
            ...(transactionUrl ? { transaction_url: transactionUrl } : {}),
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        verificationLog.warn("adapter_fetch_failed", {
            platform: runtime.entry.platform,
            adapter: runtime.entry.adapter,
            message,
        });
        return {
            ok: false,
            transaction_status: "FAILED",
            message: message || `Could not verify transaction with ${bankConfig.displayName}.`,
        };
    }
    const normalized = runtime.adapter.normalizeReceipt(raw, transactionId);
    if (!normalized.ok) {
        return {
            ok: false,
            transaction_status: normalized.transaction_status,
            message: normalized.message,
        };
    }
    return { ok: true, receipt: normalized.receipt };
}
//# sourceMappingURL=verification.service.js.map