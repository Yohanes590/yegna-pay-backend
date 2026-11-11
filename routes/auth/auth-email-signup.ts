import { Router } from "express"
import { UserCheckFunction } from "../../lib/user-checking-function.js"
import { prisma } from "../../lib/prisma.js"
import { JWTGenerate, } from "../../lib/JWT-generate.js"
import { SendingMessage } from "../../lib/sending-email.js"
import bcrypt from "bcryptjs"
import { ErrorPage } from "../../service/error-page-display.js"
const router = Router()

router.post("/", async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({
            status: 400,
            message: "Please fill blank spaces"
        });
    }

    try {
        const CheckEmail = await UserCheckFunction(email);

        if (CheckEmail.status == 400) {
            const CheckTheVerification = await prisma.users.findUnique({
                where: { email }
            });

            if (CheckTheVerification?.verified) {
                return res.status(400).json({
                    status: 400,
                    message: "Email address already exists",
                });
            }

            // Generate JWT for existing unverified user
            const TokenResult = JWTGenerate({
                id: CheckTheVerification?.id,
                email: email
            }, "15m");

            // NOTE: Double check if your token string is in TokenResult.token or TokenResult.message!
            const actualToken = TokenResult.message || TokenResult.message;

            try {
                await SendingMessage(email, actualToken);
                return res.status(403).json({
                    status: 403,
                    message: "Please Verify Your Email Address"
                });
            } catch (mailErr) {
                console.error("Mail dispatch error (Existing User):", mailErr);
                return res.status(500).json({ status: 500, message: "Email delivery failed." });
            }
        }

        // Brand New User Flow
        const genSalt = await bcrypt.genSalt(10);
        const HashedPassword = await bcrypt.hash(password, genSalt);

        const userId = await prisma.users.create({
            data: {
                full_name: `${first_name} ${last_name}`,
                email: email,
                password: HashedPassword,
                Provider: "gmail",
                account_status: "active",
                payment_plan: "free",
                verified: false,
                request_available: Number(process.env.FREE_REQUESTS || 200),
                free_requests_remaining: Number(process.env.FREE_REQUESTS || 200),
                free_requests_used: 0,
                paid_requests_balance: 0,
                paid_requests_used: 0
            }
        });

        const TokenResult = JWTGenerate({
            id: userId.id,
            email: email
        }, "15m");

        if (TokenResult.status === 200) {
            const actualToken = TokenResult.message || TokenResult.message;

            try {
                await SendingMessage(email, actualToken);
                return res.status(403).json({
                    status: 403,
                    message: "Please Verify Your Email Address",
                });
            } catch (mailErr) {
                console.error("Mail dispatch error (New User):", mailErr);
                return res.status(500).json({ status: 500, message: "Email delivery failed." });
            }
        } else {
            return res.status(400).json({
                status: 400,
                message: "Something went wrong generating your token"
            });
        }

    } catch (error) {
        console.error("Global Registration Error:", error);
        return res.status(500).send(ErrorPage);
    }
});
export default router