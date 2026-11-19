import "dotenv/config";
import { extractCleanTransactionId } from "../../lib/cbe-domain.js";
export declare function getDomainFromEnv(envVarName: string, fallbackUrl: string): URL;
export declare function validateBankDomain(envVarName: string, bankLabel: string, fallbackUrl: string, inputUrlStr: string): {
    extractedPath: string;
    fullUrl: string;
};
export declare function buildBankReceiptUrl(baseDomain: URL, transaction_id: string, transaction_url?: string): string;
export { extractCleanTransactionId };
//# sourceMappingURL=domain.d.ts.map