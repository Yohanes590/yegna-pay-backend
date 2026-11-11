import "dotenv/config";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.SECRETE_KEY || process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || "yegna-pay-jwt-secret-key-production-32chars";
export function JWTGenerate(data, life_span) {
    try {
        const token = jwt.sign(data, JWT_SECRET, {
            expiresIn: life_span
        });
        return {
            status: 200,
            message: token
        };
    }
    catch (error) {
        console.error("JWT sign failed:", error?.message || error);
        return {
            status: 500,
            message: "token generation failed"
        };
    }
}
export function VerifyToken(token) {
    try {
        if (!token || typeof token !== "string" || token.trim() === "") {
            return {
                status: 400,
                message: "Missing token"
            };
        }
        const decodeToken = jwt.verify(token, JWT_SECRET);
        return {
            status: 200,
            message: decodeToken
        };
    }
    catch (error) {
        return {
            status: 400,
            message: error.message
        };
    }
}
//# sourceMappingURL=JWT-generate.js.map