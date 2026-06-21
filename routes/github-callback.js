import { Router } from "express";
import { ErrorPage } from "../service/error-page-display.js";
import { UserCheckFunction } from "../lib/user-checking-function.js";
import { prisma } from "../lib/prisma.js";
import { JWTGenerate } from "../lib/JWT-generate.js";
const router = Router();
router.get("/", async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.send(ErrorPage);
    }
    else {
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
        });
        if (TokenResponse.ok) {
            const user_token = await TokenResponse.json();
            const FetchUserData = await fetch("https://api.github.com/user", {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${user_token.access_token}`,
                    'Accept': "application/json"
                }
            });
            const UserInfo = await FetchUserData.json();
            const fetchEmailAddress = await fetch("https://api.github.com/user/emails", {
                headers: {
                    "Authorization": `Bearer ${user_token.access_token}`
                }
            });
            const userEmail = await fetchEmailAddress.json();
            const FindUserEmail = await UserCheckFunction(userEmail[0].email);
            if (FindUserEmail.status == 200) {
                try {
                    const CreatedUser = await prisma.users.create({
                        data: {
                            full_name: UserInfo.name,
                            avatar_url: UserInfo.avatar_url,
                            email: userEmail[0].email,
                            Provider: "github",
                            account_status: "active",
                            payment_plan: "free",
                            verified: true,
                            request_available: 200
                        }
                    });
                    const createLoginToken = JWTGenerate({
                        id: CreatedUser.id,
                        email: CreatedUser.email
                    }, "7d");
                    res.cookie("access_token", createLoginToken.message, {

                        sameSite: "none"
                    });
                    return res.redirect(process.env.CLIENT_URL + "/dashboard");
                }
                catch (error) {
                    return res.send(ErrorPage);
                }
            }
            else {
                const createLoginToken = JWTGenerate({
                    id: FindUserEmail.user?.id,
                    email: FindUserEmail.user?.email
                }, "7d");
                res.cookie("access_token", createLoginToken.message, {

                    sameSite: "none",
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
                return res.redirect(process.env.CLIENT_URL + "/dashboard");
            }
        }
        else {
            return res.json({
                message: "Something went wrong!!"
            });
        }
    }
});
export default router;
//# sourceMappingURL=github-callback.js.map