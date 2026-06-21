import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { JWTGenerate, VerifyToken } from "../../lib/JWT-generate.js";
const router = Router();
router.post("/", async (req, res) => {
    const tokenVerification = VerifyToken(req.body.token);
    try {
        const UserID = await prisma.users.update({
            where: {
                email: tokenVerification.message.email
            },
            data: {
                verified: true
            }
        });
        const generatedToken = JWTGenerate({
            id: UserID.id,
            email: tokenVerification.message.email
        }, "7d");
        return res.status(200).json({
            status: 200,
            message: "Account Verified Successfully",
            token: generatedToken,
        });
    }
    catch (error) {
        return res.status(400).json({
            status: 400,
            message: "Can't verified account"
        });
    }
});
export default router;
//# sourceMappingURL=auth-verify-token.js.map