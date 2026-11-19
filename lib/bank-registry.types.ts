import type { BankPlatformCode, BankRegistryId, LinkReadable } from "../modules/verification/bank.types.js";

export type BankIdentifier = BankRegistryId;

export interface BankConfig {
    identifier: BankIdentifier;
    displayName: string;
    platform: BankPlatformCode;
    enabled: boolean;
    envVarName: string;
    linkReadable: LinkReadable;
    adapterId: string;
    getDomain: () => URL;
    validateUrl: (inputUrlStr: string) => { extractedPath: string; fullUrl: string };
    extractId: (inputUrlOrId: string) => string;
    reader: (params: { transaction_id: string; transaction_url?: string }) => Promise<unknown>;
}