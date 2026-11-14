import { getErrorDefinition } from "./error-registry.js";
export class AppError extends Error {
    errorKey;
    errorCode;
    status;
    category;
    transactionStatus;
    constructor(errorKey, options = {}) {
        const def = getErrorDefinition(errorKey);
        const resolvedMessage = def.category === "SERVER_ERRORS" ? def.message : options.message || def.message;
        super(resolvedMessage, options.cause !== undefined ? { cause: options.cause } : undefined);
        this.name = "AppError";
        this.errorKey = def.key;
        this.errorCode = def.code;
        this.status = options.status ?? def.status;
        this.category = def.category;
        this.transactionStatus = options.transactionStatus;
    }
}
//# sourceMappingURL=app-error.js.map