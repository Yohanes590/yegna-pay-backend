export declare function ProjectAPIKey(APIKey: string): Promise<{
    message: string;
    success: boolean;
    data?: never;
} | {
    message: string;
    data: {
        id: string;
        user_Id: string;
    };
    success: boolean;
}>;
//# sourceMappingURL=ProjectAPICheck.d.ts.map