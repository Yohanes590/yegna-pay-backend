import { Router } from "express"
import { ErrorPage } from "../service/error-page-display.js"
import { JWT, OAuth2Client } from 'google-auth-library';
import { UserCheckFunction } from "../lib/user-checking-function.js";
import { prisma } from "../lib/prisma.js"
import { JWTGenerate } from "../lib/JWT-generate.js";
import { SendCookie } from "../service/sending-cookie.js";
const router = Router()
const clientSide = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.SERVER_URL
)
router.get("/", async (req, res) => {
    const code = req.query.code as string;

    if (!code) {
        return res.status(400).send(ErrorPage);
    }

    try {
        let tokens;
        try {
            const tokenResponse = await clientSide.getToken(code);
            tokens = tokenResponse.tokens;
        } catch (error: any) {
            console.error("Google Auth getToken error:", error.message || error);
            if (error.cause) console.error("Google Auth getToken cause:", error.cause);
            return res.status(500).send("Error authenticating with Google: " + (error.message || "Unknown network error"));
        }

        const Ticket = await clientSide.verifyIdToken({
            idToken: tokens.id_token as string,
            audience: process.env.CLIENT_ID as string
        });
        const verification = Ticket.getPayload();

        if (!verification?.email) {
            return res.status(400).send("Invalid token payload from Google");
        }

        const functionResponse = await UserCheckFunction(verification.email);
        let userInfo = functionResponse.user;

        if (functionResponse.status === 200) {
            userInfo = await prisma.users.create({
                data: {
                    full_name: `${verification.given_name || ""} ${verification.family_name || ""}`.trim(),
                    email: verification.email,
                    avatar_url: verification.picture || "",
                    Provider: "google",
                    account_status: "active",
                    payment_plan: "free",
                    verified: true,
                    request_available: 200
                }
            });
        }


        const UserToken = JWTGenerate({
            id: userInfo?.id,
            email: userInfo?.email
        }, "7d");

        // await SendCookie(UserToken.message)

        return res.redirect(`${process.env.CLIENT_URL}/api/call-back?token=${UserToken.message}`);

        // return res.redirect(`${process.env.CLIENT_URL}/dashboard`);

    } catch (globalError: any) {
        console.error("Authentication crash:", globalError);
        return res.status(500).send("Internal Server Error during login.");
    }
});

export default router;