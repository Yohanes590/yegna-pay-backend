import { Router } from "express";
import { UserCheckFunction } from "../../lib/user-checking-function.js";
import { prisma } from "../../lib/prisma.js";
import { JWTGenerate, } from "../../lib/JWT-generate.js";
import { SendingMessage } from "../../lib/sending-email.js";
import bcrypt from "bcryptjs";
import { ErrorPage } from "../../service/error-page-display.js";
const router = Router();
router.post("/", async (req, res) => {
    if (req.body.first_name == "" || req.body.last_name == "" || req.body.email == "" || req.body.password == "") {
        return res.status(400).json({
            status: 401,
            message: "Please fill blank spaces"
        });
    }
    else {
        const CheckEmail = await UserCheckFunction(req.body.email);
        if (CheckEmail.status == 400) {
            const CheckTheVerification = await prisma.users.findUnique({
                where: {
                    email: req.body.email
                }
            });
            if (CheckTheVerification?.verified) {
                return res.status(400).send({
                    status: 400,
                    message: "Email address already exists",
                });
            }
            else {
                const Token = JWTGenerate({
                    id: CheckTheVerification?.id,
                    email: req.body.email
                }, "15m");
                await SendingMessage(req.body.email, Token.message);
                return res.status(403).send({
                    status: 403,
                    message: "Please Verify Your Email Address"
                });
            }
        }
        else {
            try {
                const genSalt = await bcrypt.genSalt(10);
                const HashedPassword = await bcrypt.hash(req.body.password, genSalt);
                const userId = await prisma.users.create({
                    data: {
                        full_name: req.body.first_name + " " + req.body.last_name,
                        email: req.body.email,
                        password: HashedPassword,
                        Provider: "gmail",
                        account_status: "active",
                        payment_plan: "free",
                        verified: false,
                        request_available: 200
                    }
                });
                const Token = JWTGenerate({
                    id: userId.id,
                    email: req.body.email
                }, "15m");
                if (Token.status == 200) {
                    await SendingMessage(req.body.email, Token.message);
                    return res.json({
                        status: 405,
                        message: "Please Verify Your Email Address",
                    });
                }
                else {
                    return res.json({
                        status: 400,
                        message: "something went wrong"
                    });
                }
            }
            catch (error) {
                return res.status(500).send(ErrorPage);
            }
        }
    }
});
export default router;
//# sourceMappingURL=auth-email-signup.js.map