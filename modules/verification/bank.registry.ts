import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type {
    BankJsonEntry,
    BankPlatformCode,
    BankRegistryId,
    BanksConfigFile,
    RuntimeBankDefinition,
} from "./bank.types.js";
import type { BankConfig, BankIdentifier } from "../../lib/bank-registry.types.js";
import { getDomainFromEnv, validateBankDomain, extractCleanTransactionId } from "./domain.js";
import { resolveAdapter } from "./adapters/index.js";
import { verificationLog } from "./structured-logger.js";

const CONFIG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../config/banks.json");

let cachedConfig: BanksConfigFile | null = null;
let cachedByPlatform: Map<string, RuntimeBankDefinition> | null = null;
let cachedByRegistryId: Map<BankRegistryId, RuntimeBankDefinition> | null = null;
let cachedAliasMap: Map<string, BankPlatformCode> | null = null;

function loadBanksConfig(): BanksConfigFile {
    if (cachedConfig) return cachedConfig;
    const raw = readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as BanksConfigFile;
    if (!parsed?.banks?.length) {
        throw new Error("banks.json must define at least one bank.");
    }
    cachedConfig = parsed;
    return parsed;
}

function buildMaps() {
    if (cachedByPlatform && cachedByRegistryId && cachedAliasMap) return;

    const byPlatform = new Map<string, RuntimeBankDefinition>();
    const byRegistry = new Map<BankRegistryId, RuntimeBankDefinition>();
    const aliases = new Map<string, BankPlatformCode>();

    for (const entry of loadBanksConfig().banks) {
        const adapter = resolveAdapter(entry.adapter);
        const runtime: RuntimeBankDefinition = { entry, adapter };
        byPlatform.set(entry.platform.toUpperCase(), runtime);
        byRegistry.set(entry.registryId, runtime);

        aliases.set(entry.platform.toUpperCase(), entry.platform);
        for (const alias of entry.aliases ?? []) {
            aliases.set(alias.toUpperCase().trim(), entry.platform);
        }
    }

    cachedByPlatform = byPlatform;
    cachedByRegistryId = byRegistry;
    cachedAliasMap = aliases;
}

export function getAliasMap(): ReadonlyMap<string, BankPlatformCode> {
    buildMaps();
    return cachedAliasMap!;
}

export function getRuntimeBankByPlatform(platform: string): RuntimeBankDefinition | null {
    buildMaps();
    const key = platform.toUpperCase().trim();
    return cachedByPlatform!.get(key) ?? null;
}

export function getRuntimeBankByRegistryId(id: BankRegistryId): RuntimeBankDefinition {
    buildMaps();
    const found = cachedByRegistryId!.get(id);
    if (!found) {
        throw new Error(`Bank registry id "${id}" is not configured.`);
    }
    return found;
}

export function listEnabledBanks(): BankJsonEntry[] {
    return loadBanksConfig().banks.filter((b) => b.enabled);
}

export function buildLegacyBankConfig(registryId: BankIdentifier): BankConfig {
    const runtime = getRuntimeBankByRegistryId(registryId as BankRegistryId);
    const { entry, adapter } = runtime;

    if (!entry.enabled) {
        verificationLog.warn("bank_disabled_access", { platform: entry.platform });
    }

    return {
        identifier: registryId,
        displayName: entry.name,
        platform: entry.platform,
        enabled: entry.enabled,
        envVarName: entry.domain_env,
        linkReadable: entry.link_readable,
        adapterId: entry.adapter,
        getDomain: () => getDomainFromEnv(entry.domain_env, entry.domain_fallback),
        validateUrl: (url: string) =>
            validateBankDomain(entry.domain_env, entry.name, entry.domain_fallback, url),
        extractId: (input: string) => extractCleanTransactionId(input),
        reader: async (params) => {
            if (!entry.enabled) {
                throw new Error(`${entry.name} integration is temporarily disabled.`);
            }
            const baseDomain = getDomainFromEnv(entry.domain_env, entry.domain_fallback);
            const { raw } = await adapter.fetchTransaction({
                transaction_id: params.transaction_id,
                ...(params.transaction_url ? { transaction_url: params.transaction_url } : {}),
                baseDomain,
            });
            return raw;
        },
    };
}

export function buildAllLegacyBankConfigs(): Record<BankIdentifier, BankConfig> {
    const ids: BankIdentifier[] = ["CBE", "AWAS_BANK", "BOA"];
    return ids.reduce(
        (acc, id) => {
            acc[id] = buildLegacyBankConfig(id);
            return acc;
        },
        {} as Record<BankIdentifier, BankConfig>
    );
}