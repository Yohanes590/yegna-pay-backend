import { Router } from "express";
import { JWTGenerate, VerifyToken } from "../../lib/JWT-generate.js";
import { prisma } from "../../lib/prisma.js";
const router = Router();
router.post("/", async (req, res) => {
    const clientToken = req.body.token;
    const DecodeToken = VerifyToken(clientToken);
    if (DecodeToken.status == 200) {
        const fetchEmail = await prisma.users.findUnique({
            where: {
                email: DecodeToken.message.email
            },
            select: {
                id: true,
                full_name: true,
                email: true,
                payment_plan: true,
                request_available: true,
                projects: {
                    select: {
                        id: true,
                        api_sec_key: true,
                        before_expires: true,
                        call_back_url: true,
                        project_name: true,
                        project_description: true,
                        receiver_name: true,
                        transactions: true,
                    },
                },
                avatar_url: true,
                account_status: true,
            },
        });
        if (!fetchEmail) {
            return res.status(400).json({
                status: 400,
                message: "No user found",
                token: clientToken
            });
        }
        else {
            const accountStatus = fetchEmail.account_status;
            if (accountStatus == "active") {
                return res.status(200).json({
                    status: 200,
                    fetchEmail,
                });
            }
            else {
                return res.status(400).json({
                    status: 400,
                    message: "This account is disabled by admin please contact us"
                });
            }
        }
    }
    else {
        return res.status(400).json({
            status: 400,
            message: "Token Expired Login again please",
        });
    }
});
export default router;
//# sourceMappingURL=auth-check.js.map