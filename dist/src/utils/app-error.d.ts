import { type ErrorDefinition } from "./error-registry.js";
export interface AppErrorOptions {
    message?: string | undefined;
    status?: number | undefined;
    transactionStatus?: string | undefined;
    cause?: unknown;
}
export declare class AppError extends Error {
    readonly errorKey: string;
    readonly errorCode: string;
    readonly status: number;
    readonly category: ErrorDefinition["category"];
    readonly transactionStatus: string | undefined;
    constructor(errorKey: string, options?: AppErrorOptions);
}
//# sourceMappingURL=app-error.d.ts.map