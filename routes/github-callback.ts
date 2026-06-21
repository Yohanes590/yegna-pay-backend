import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { JWTGenerate } from "../lib/JWT-generate.js"
import { SendCookie } from "../service/sending-cookie.js"
const router = Router()

router.get("/", async (req, res) => {
    const code = req.query.code as string
    if (!code) {
        return res.status(400).json({ "message": "there is no code" })
    }

    try {
        const TokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_AUTH_SECRATE,
                code,
            })
        })

        if (!TokenResponse.ok) {
            return res.status(400).json({ message: "Something went wrong fetching access token!" })
        }

        const user_token = await TokenResponse.json()

        if (!user_token.access_token) {
            return res.status(400).json({ "error": "Invalid token response", "details": user_token })
        }

        const fetchHeaders = {
            'Authorization': `Bearer ${user_token.access_token}`,
            'Accept': "application/json",
            'User-Agent': 'Yegna-Pay'
        }

        const FetchUserData = await fetch("https://api.github.com/user", {
            method: "GET",
            headers: fetchHeaders
        })
        const UserInfo = await FetchUserData.json()

        const fetchEmailAddress = await fetch("https://api.github.com/user/emails", {
            method: "GET",
            headers: fetchHeaders
        })
        const userEmail = await fetchEmailAddress.json()

        if (!userEmail || !Array.isArray(userEmail) || userEmail.length === 0) {
            return res.status(400).json({
                "error": "there is no information",
                "details": "Email list empty from GitHub.",
                "github_response": userEmail
            })
        }

        const primaryEmailObject = userEmail.find((emailObj: any) => emailObj.primary === true)
        const primaryEmail = primaryEmailObject ? primaryEmailObject.email : userEmail[0]?.email

        if (!primaryEmail) {
            return res.status(400).json({
                "error": "there is no information",
                "details": "Primary email property missing"
            })
        }

        // FIX: Direct Prisma lookup instead of depending on an external function wrapper
        let existingUser = await prisma.users.findUnique({
            where: { email: primaryEmail }
        })

        // If the user truly doesn't exist in the DB, create them now
        if (!existingUser) {
            existingUser = await prisma.users.create({
                data: {
                    full_name: UserInfo.name || UserInfo.login,
                    avatar_url: UserInfo.avatar_url,
                    email: primaryEmail,
                    Provider: "github",
                    account_status: "active",
                    payment_plan: "free",
                    verified: true,
                    request_available: 200
                }
            })
        }

        // This token generation will now ALWAYS have a valid user ID
        const createLoginToken = JWTGenerate({
            id: existingUser.id,
            email: existingUser.email
        }, "7d")

        await SendCookie(createLoginToken.message)
        return res.redirect(`${process.env.CLIENT_URL}/api/call-back?token=${createLoginToken.message}`);

    } catch (error: any) {
        console.error("OAuth Error:", error)
        return res.status(500).json({ error: error.message || "Internal Server Error" })
    }
})

export default router