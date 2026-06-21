import { Router } from "express";
import { JWTGenerate, VerifyToken } from "../../lib/JWT-generate.js";
import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
const router = Router();
router.post("/", async (req, res) => {
    const FetchUserEmail = await prisma.users.findUnique({
        where: {
            email: req.body.email_address
        }
    });
    if (FetchUserEmail?.verified == false) {
        return res.json({
            message: "please verified your email address",
            status: 400
        });
    }
    else if (FetchUserEmail) {
        const userToken = JWTGenerate({
            id: FetchUserEmail.id,
            email: req.body.email_address
        }, "7d");
        if (FetchUserEmail.Provider == "google") {
            return res.json({
                message: "Please login with google",
                status: 400,
            });
        }
        else if (FetchUserEmail.Provider == "github") {
            return res.json({
                message: "Please login with github",
                status: 400,
            });
        }
        else if (FetchUserEmail.Provider == "gmail") {
            const DecodePassword = await bcrypt.compare(req.body.password, FetchUserEmail.password);
            if (DecodePassword) {
                return res.json({
                    status: 200,
                    message: "Login Success",
                    token: userToken.message
                });
            }
            else {
                return res.json({
                    message: "No account found!!",
                    status: 400,
                });
            }
        }
        else {
            return res.json({
                status: 500,
                message: "Invalid provider account type"
            });
        }
    }
    return res.json({
        message: "Invalid account"
    });
});
export default router;
//# sourceMappingURL=login.js.map