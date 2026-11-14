export type ErrorCategory = "CLIENT_ERRORS" | "APPLICATION_ERRORS" | "SERVER_ERRORS";
export interface ErrorDefinitionInput {
    code: string;
    message: string;
    status: number;
}
export interface ErrorDefinition extends ErrorDefinitionInput {
    key: string;
    category: ErrorCategory;
}
export interface ErrorRegistryFile {
    CLIENT_ERRORS: Record<string, ErrorDefinitionInput>;
    APPLICATION_ERRORS: Record<string, ErrorDefinitionInput>;
    SERVER_ERRORS: Record<string, ErrorDefinitionInput>;
}
export interface StandardErrorResponse {
    status: number;
    success: false;
    message: string;
    error_code: string;
    data: null;
    transaction_status?: string;
}
export declare function getErrorDefinition(errorKey: string): ErrorDefinition;
export declare function getAllErrorDefinitions(): ErrorDefinition[];
export declare function getErrorRegistry(): ErrorRegistryFile;
export declare function buildErrorResponse(errorKey: string, overrides?: {
    message?: string | undefined;
    status?: number | undefined;
    transaction_status?: string | undefined;
}): StandardErrorResponse;
//# sourceMappingURL=error-registry.d.ts.map