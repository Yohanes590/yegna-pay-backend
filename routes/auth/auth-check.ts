import { Router } from "express";
import crypto from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import { JWTGenerate, VerifyToken } from "../../lib/JWT-generate.js";
import { prisma } from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import { ensureWelcomeNotification } from "../../lib/notification-service.js";
import {
    githubAvatarUrl,
    inferGithubHandleFromName,
    isGenericDisplayName,
    resolveGithubUsername,
    syncBetterAuthUserGithubProfile,
} from "../../lib/oauth-profile.js";
import { resolveUserFromSessionToken } from "../../lib/session-token-resolve.js";
import { loadMerchantUserByEmail } from "../../lib/load-merchant-user.js";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const clientToken = req.body?.token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
        let userEmail: string | null = null;
        let userId: string | null = null;

        // 1. Try decoding legacy / bearer JWT if provided
        if (clientToken && typeof clientToken === "string" && clientToken.trim() !== "") {
            const trimmedToken = clientToken.trim();
            const decodeToken = VerifyToken(trimmedToken);
            if (decodeToken.status === 200 && decodeToken.message?.email) {
                userEmail = decodeToken.message.email;
                userId = decodeToken.message.id;
            } else {
                try {
                    const sessionUser = await resolveUserFromSessionToken(trimmedToken);
                    if (sessionUser) {
                        userEmail = sessionUser.email;
                        userId = sessionUser.authUserId;
                    }
                } catch {
                    // Ignore DB lookup error and proceed to session cookie check
                }
            }
        }

        // 2. If no valid JWT, inspect Better Auth session cookies
        if (!userEmail) {
            try {
                const session = await auth.api.getSession({
                    headers: fromNodeHeaders(req.headers)
                });
                if (session?.user?.email) {
                    userEmail = session.user.email;
                    userId = session.user.id;
                }
            } catch {
                // Better Auth session check failed or no session cookie
            }
        }

        if (!userEmail) {
            return res.status(401).json({
                status: 401,
                message: "No active session or token found. Please sign in.",
            });
        }

        // 3. Find user in database
        let betterAuthUser = await prisma.user.findUnique({
            where: { email: userEmail },
        }).catch(() => null);

        if (betterAuthUser?.id) {
            await syncBetterAuthUserGithubProfile(betterAuthUser.id).catch(() => {});
            betterAuthUser = await prisma.user.findUnique({
                where: { email: userEmail },
            }).catch(() => betterAuthUser);
        }

        let fetchEmail = await loadMerchantUserByEmail(userEmail);

        // If user logged in through Better Auth but has not been populated in Users table yet
        if (!fetchEmail) {
            const finalUserId = userId || betterAuthUser?.id || crypto.randomUUID();
            const freeQuota = Number(process.env.FREE_REQUESTS || 200);
            const githubLogin = betterAuthUser?.id
                ? await resolveGithubUsername(betterAuthUser.id).catch(() => null)
                : null;
            const oauthName = (betterAuthUser?.name || "").trim();
            const signupName =
                githubLogin ||
                (!isGenericDisplayName(oauthName) ? oauthName : "") ||
                userEmail.split("@")[0] ||
                "Yegna Developer";
            const signupAvatar =
                (betterAuthUser?.image || "").trim() ||
                (githubLogin ? githubAvatarUrl(githubLogin) : "");
            await prisma.users.create({
                data: {
                    id: finalUserId,
                    full_name: signupName,
                    email: userEmail,
                    avatar_url: signupAvatar,
                    account_status: "active",
                    payment_plan: "free",
                    verified: true,
                    request_available: freeQuota,
                    free_requests_remaining: freeQuota,
                    free_requests_used: 0,
                    paid_requests_balance: 0,
                    paid_requests_used: 0,
                    Provider: githubLogin ? "github" : "better-auth",
                },
            });
            fetchEmail = await loadMerchantUserByEmail(userEmail);
        }

        if (!fetchEmail) {
            return res.status(500).json({
                status: 500,
                message: "Merchant profile could not be loaded after sign-in.",
            });
        }

        if (betterAuthUser) {
            const githubFromAccount = await resolveGithubUsername(betterAuthUser.id);
            const githubFromName = inferGithubHandleFromName(betterAuthUser.name);
            const githubUsername = githubFromAccount || githubFromName;
            const oauthName = (betterAuthUser.name || "").trim();
            const preferredName =
                githubUsername ||
                (!isGenericDisplayName(oauthName) ? oauthName : "") ||
                (!isGenericDisplayName(fetchEmail.full_name) ? fetchEmail.full_name : oauthName) ||
                fetchEmail.full_name;
            const preferredAvatar = (
                betterAuthUser.image ||
                fetchEmail.avatar_url ||
                (githubUsername ? githubAvatarUrl(githubUsername) : "")
            ).trim();
            const provider =
                fetchEmail.Provider && fetchEmail.Provider !== "better-auth"
                    ? fetchEmail.Provider
                    : githubUsername
                    ? "github"
                    : fetchEmail.Provider || "better-auth";

            const shouldUpdateProfile =
                (preferredName && preferredName !== fetchEmail.full_name) ||
                (preferredAvatar && preferredAvatar !== (fetchEmail.avatar_url || "")) ||
                (provider !== fetchEmail.Provider);

            if (shouldUpdateProfile) {
                await prisma.users.update({
                    where: { id: fetchEmail.id },
                    data: {
                        full_name: preferredName,
                        avatar_url: preferredAvatar || fetchEmail.avatar_url,
                        Provider: provider,
                    },
                });
                fetchEmail = (await loadMerchantUserByEmail(userEmail)) ?? fetchEmail;
            }

            (fetchEmail as any).github_username = githubUsername || inferGithubHandleFromName(fetchEmail.full_name);
        }

        if (!fetchEmail.avatar_url && betterAuthUser?.image) {
            (fetchEmail as any).avatar_url = betterAuthUser.image;
        }

        if (fetchEmail.account_status !== "active") {
            return res.status(403).json({
                status: 403,
                message: "This account is disabled. Please contact support."
            });
        }

        await ensureWelcomeNotification(fetchEmail.id).catch(() => {});

        const issuedToken = JWTGenerate({
            id: fetchEmail.id,
            email: fetchEmail.email
        }, "7d");

        if (issuedToken.status !== 200 || typeof issuedToken.message !== "string" || !issuedToken.message) {
            console.error("Auth check: JWT issuance failed", issuedToken);
            return res.status(500).json({
                status: 500,
                message: "Unable to issue session token. Check SECRETE_KEY / JWT_SECRET on the backend.",
            });
        }

        return res.status(200).json({
            status: 200,
            fetchEmail,
            token: issuedToken.message
        });

    } catch (err: any) {
        console.error("Auth check error:", err?.message || err, err?.code);
        const hint =
            typeof err?.message === "string" && err.message.includes("column")
                ? "Database schema may be out of date — run prisma db push on the backend."
                : undefined;
        return res.status(500).json({
            status: 500,
            message: "Internal server error verifying authentication session.",
            hint,
        });
    }
});

export default router;
