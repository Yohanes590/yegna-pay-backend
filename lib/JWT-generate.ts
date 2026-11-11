import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SECRETE_KEY || process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || "yegna-pay-jwt-secret-key-production-32chars";

export function JWTGenerate(data: any, life_span: any) {
    try {
        const token = jwt.sign(data, JWT_SECRET, {
            expiresIn: life_span
        });
        return {
            status: 200,
            message: token
        };
    } catch (error: any) {
        console.error("JWT sign failed:", error?.message || error);
        return {
            status: 500,
            message: "token generation failed"
        };
    }
}

export function VerifyToken(token: string) {
    try {
        if (!token || typeof token !== "string" || token.trim() === "") {
            return {
                status: 400,
                message: "Missing token"
            };
        }
        const decodeToken = jwt.verify(token, JWT_SECRET) as any;
        return {
            status: 200,
            message: decodeToken
        };
    } catch (error: any) {
        return {
            status: 400,
            message: error.message
        };
    }
}
