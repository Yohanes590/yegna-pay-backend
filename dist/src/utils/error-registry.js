import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
function resolveErrorCodesPath() {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
        path.resolve(currentDir, "../config/error-codes.json"),
        path.resolve(currentDir, "../../src/config/error-codes.json"),
        path.resolve(process.cwd(), "src/config/error-codes.json"),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    throw new Error(`Unable to locate error-codes.json. Checked: ${candidates.join(", ")}`);
}
function loadRegistry() {
    const filePath = resolveErrorCodesPath();
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);
    const byKey = new Map();
    const seenCodes = new Set();
    const all = [];
    const categories = ["CLIENT_ERRORS", "APPLICATION_ERRORS", "SERVER_ERRORS"];
    for (const category of categories) {
        const entries = parsed[category] || {};
        for (const [key, def] of Object.entries(entries)) {
            if (seenCodes.has(def.code)) {
                throw new Error(`Duplicate error code "${def.code}" detected in error-codes.json`);
            }
            seenCodes.add(def.code);
            const fullDef = {
                key,
                category,
                code: def.code,
                message: def.message,
                status: def.status,
            };
            byKey.set(key, fullDef);
            all.push(fullDef);
        }
    }
    return { raw: parsed, byKey, all };
}
const registryCache = loadRegistry();
export function getErrorDefinition(errorKey) {
    const found = registryCache.byKey.get(errorKey);
    if (found) {
        return found;
    }
    const fallback = registryCache.byKey.get("INTERNAL_SERVER_ERROR");
    if (!fallback) {
        throw new Error("INTERNAL_SERVER_ERROR must be defined in error-codes.json");
    }
    return fallback;
}
export function getAllErrorDefinitions() {
    return [...registryCache.all];
}
export function getErrorRegistry() {
    return registryCache.raw;
}
export function buildErrorResponse(errorKey, overrides) {
    const def = getErrorDefinition(errorKey);
    const isServerError = def.category === "SERVER_ERRORS";
    const response = {
        status: overrides?.status ?? def.status,
        success: false,
        message: isServerError ? def.message : overrides?.message ?? def.message,
        error_code: def.code,
        data: null,
    };
    if (overrides?.transaction_status) {
        response.transaction_status = overrides.transaction_status;
    }
    return response;
}
//# sourceMappingURL=error-registry.js.map