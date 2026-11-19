import type { BankAdapter } from "../bank.types.js";
import { cbeAdapter } from "./cbe.adapter.js";
import { awashAdapter } from "./awash.adapter.js";
import { boaAdapter } from "./boa.adapter.js";

const ADAPTERS: Record<string, BankAdapter> = {
    cbe: cbeAdapter,
    awash: awashAdapter,
    boa: boaAdapter,
};

export function resolveAdapter(adapterId: string): BankAdapter {
    const adapter = ADAPTERS[adapterId];
    if (!adapter) {
        throw new Error(`No verification adapter registered for "${adapterId}".`);
    }
    return adapter;
}

export { cbeAdapter, awashAdapter, boaAdapter };