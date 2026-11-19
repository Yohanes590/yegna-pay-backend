import type { BankJsonEntry, BankPlatformCode, BankRegistryId, RuntimeBankDefinition } from "./bank.types.js";
import type { BankConfig, BankIdentifier } from "../../lib/bank-registry.types.js";
export declare function getAliasMap(): ReadonlyMap<string, BankPlatformCode>;
export declare function getRuntimeBankByPlatform(platform: string): RuntimeBankDefinition | null;
export declare function getRuntimeBankByRegistryId(id: BankRegistryId): RuntimeBankDefinition;
export declare function listEnabledBanks(): BankJsonEntry[];
export declare function buildLegacyBankConfig(registryId: BankIdentifier): BankConfig;
export declare function buildAllLegacyBankConfigs(): Record<BankIdentifier, BankConfig>;
//# sourceMappingURL=bank.registry.d.ts.map