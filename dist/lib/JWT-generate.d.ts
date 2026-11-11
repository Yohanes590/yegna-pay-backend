import "dotenv/config";
export declare function JWTGenerate(data: any, life_span: any): {
    status: number;
    message: string;
};
export declare function VerifyToken(token: string): {
    status: number;
    message: any;
};
//# sourceMappingURL=JWT-generate.d.ts.map