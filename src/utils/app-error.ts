import { getErrorDefinition, type ErrorDefinition } from "./error-registry.js";

export interface AppErrorOptions {
    message?: string | undefined;
    status?: number | undefined;
    transactionStatus?: string | undefined;
    cause?: unknown;
}

export class AppError extends Error {
    public readonly errorKey: string;
    public readonly errorCode: string;
    public readonly status: number;
    public readonly category: ErrorDefinition["category"];
    public readonly transactionStatus: string | undefined;

    constructor(errorKey: string, options: AppErrorOptions = {}) {
        const def = getErrorDefinition(errorKey);
        const resolvedMessage =
            def.category === "SERVER_ERRORS" ? def.message : options.message || def.message;

        super(resolvedMessage, options.cause !== undefined ? { cause: options.cause } : undefined);
        this.name = "AppError";
        this.errorKey = def.key;
        this.errorCode = def.code;
        this.status = options.status ?? def.status;
        this.category = def.category;
        this.transactionStatus = options.transactionStatus;
    }
}

