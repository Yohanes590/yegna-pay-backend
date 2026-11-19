import type { BankConfig } from "../../lib/bank-registry.types.js";
import type { SupportedBankCode } from "../../lib/bank-resolver.js";
import type { FetchReceiptOutcome } from "../../service/bank-features/unified-bank-check.js";
export declare function bankCodeFromConfig(bankConfig: BankConfig): SupportedBankCode;
export declare function fetchAndNormalizeViaAdapter(bankConfig: BankConfig, transactionId: string, transactionUrl?: string): Promise<FetchReceiptOutcome>;
//# sourceMappingURL=verification.service.d.ts.map