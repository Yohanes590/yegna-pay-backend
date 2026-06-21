import jwt from "jsonwebtoken";
export function JWTGenerate(data: any, life_span: any) {
    try {
        const GenerateData = jwt.sign(data, process.env.PRIVATE_KEY!, {
            algorithm: "RS256",
            expiresIn: life_span
        })
        return {
            status: 200,
            message: GenerateData
        }
    } catch (error: any) {
        return {
            status: 500,
            message: "token can generated"
        }
    }

}


export function VerifyToken(token: string) {
    try {
        const decodeToken = jwt.verify(token, process.env.PRIVATE_KEY!)
        return {
            status: 200,
            message: decodeToken
        }
    } catch (error: any) {
        return {
            status: 400,
            message: error.message
        }
    }
}