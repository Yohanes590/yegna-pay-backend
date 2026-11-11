import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { JWTGenerate } from "../lib/JWT-generate.js";
import { SendCookie } from "../service/sending-cookie.js";
const router = Router();
router.get("/", async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ "message": "there is no code" });
    }
    try {
        // --- 1. EXCHANGE CODE FOR ACCESS TOKEN ---
        const TokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            })
        });
        if (!TokenResponse.ok) {
            return res.status(400).json({ message: "Something went wrong fetching access token!" });
        }
        const user_token = await TokenResponse.json();
        if (!user_token || !user_token.access_token) {
            console.error("Vercel Log - Invalid Token Response:", user_token);
            return res.status(400).json({ "error": "Invalid token response", "details": user_token });
        }
        const fetchHeaders = {
            'Authorization': `Bearer ${user_token.access_token}`,
            'Accept': "application/json",
            'User-Agent': 'Yegna-Pay'
        };
        // --- 2. FETCH USER PROFILE ---
        const FetchUserData = await fetch("https://api.github.com/user", {
            method: "GET",
            headers: fetchHeaders
        });
        const UserInfo = await FetchUserData.json();
        // --- 3. FETCH USER EMAILS ---
        const fetchEmailAddress = await fetch("https://api.github.com/user/emails", {
            method: "GET",
            headers: fetchHeaders
        });
        const userEmail = await fetchEmailAddress.json();
        // Guardrail: Ensure userEmail is an array before doing any array methods (.find)
        if (!userEmail || !Array.isArray(userEmail) || userEmail.length === 0) {
            console.error("Vercel Log - Empty or Invalid Email List:", userEmail);
            return res.status(400).json({
                "error": "there is no information",
                "details": "Email list empty or failed from GitHub.",
                "github_response": userEmail
            });
        }
        // Safe extraction of primary email with optional chaining checks
        const primaryEmailObject = userEmail.find((emailObj) => emailObj && emailObj.primary === true);
        // Completely safe for TypeScript and guarantees no production crashes
        const primaryEmail = primaryEmailObject?.email || (userEmail && userEmail[0] ? userEmail[0].email : null);
        if (!primaryEmail) {
            return res.status(400).json({
                "error": "there is no information",
                "details": "Primary email property missing from array match."
            });
        }
        // --- 4. DATABASE OPERATIONS WITH PRISMA ---
        let existingUser = null;
        try {
            existingUser = await prisma.users.findUnique({
                where: { email: primaryEmail }
            });
            if (!existingUser) {
                existingUser = await prisma.users.create({
                    data: {
                        full_name: UserInfo.name || UserInfo.login || "GitHub User",
                        avatar_url: UserInfo.avatar_url || "",
                        email: primaryEmail,
                        Provider: "github",
                        account_status: "active",
                        payment_plan: "free",
                        verified: true,
                        request_available: Number(process.env.FREE_REQUESTS || 200),
                        free_requests_remaining: Number(process.env.FREE_REQUESTS || 200),
                        free_requests_used: 0,
                        paid_requests_balance: 0,
                        paid_requests_used: 0
                    }
                });
            }
        }
        catch (dbError) {
            console.error("Vercel Log - Database/Prisma Failed:", dbError.message || dbError);
            return res.status(500).json({
                error: "Database error",
                details: "Failed to query or write user to database. Check your DATABASE_URL environment variable."
            });
        }
        // --- 5. JWT GENERATION GUARDRAIL ---
        // Absolutely ensures existingUser is valid before reading properties
        if (!existingUser || !existingUser.email || !existingUser.id) {
            console.error("Vercel Log - existingUser object is missing required fields:", existingUser);
            return res.status(500).json({
                error: "Internal Server Error",
                details: "User record processing failed unexpectedly."
            });
        }
        const createLoginToken = JWTGenerate({
            id: existingUser.id,
            email: existingUser.email
        }, "7d");
        // Send token and redirect
        await SendCookie(createLoginToken.message);
        const clientRedirectUrl = process.env.CLIENT_URL || "http://localhost:3000";
        return res.redirect(`${clientRedirectUrl}/api/call-back?token=${createLoginToken.message}`);
    }
    catch (error) {
        console.error("Vercel Log - Core OAuth Callback Error:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});
export default router;
//# sourceMappingURL=github-callback.js.map