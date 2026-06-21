import jwt from "jsonwebtoken";
export function JWTGenerate(data, life_span) {
    try {
        const GenerateData = jwt.sign(data, process.env.PRIVATE_KEY, {
            algorithm: "RS256",
            expiresIn: life_span
        });
        return {
            status: 200,
            message: GenerateData
        };
    }
    catch (error) {
        return {
            status: 500,
            message: "token can generated"
        };
    }
}
export function VerifyToken(token) {
    try {
        const decodeToken = jwt.verify(token, process.env.PRIVATE_KEY);
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