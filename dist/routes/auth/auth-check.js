import { Router } from "express";
import crypto from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import { JWTGenerate, VerifyToken } from "../../lib/JWT-generate.js";
import { prisma } from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import { ensureWelcomeNotification } from "../../lib/notification-service.js";
import { inferGithubHandleFromName, isGenericDisplayName, resolveGithubUsername, } from "../../lib/oauth-profile.js";
const router = Router();
router.post("/", async (req, res) => {
    try {
        const clientToken = req.body?.token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
        let userEmail = null;
        let userId = null;
        // 1. Try decoding legacy / bearer JWT if provided
        if (clientToken && typeof clientToken === "string" && clientToken.trim() !== "") {
            const trimmedToken = clientToken.trim();
            const decodeToken = VerifyToken(trimmedToken);
            if (decodeToken.status === 200 && decodeToken.message?.email) {
                userEmail = decodeToken.message.email;
                userId = decodeToken.message.id;
            }
            else {
                // 1b. Check if clientToken is a Better Auth session database token
                try {
                    const dbSession = await prisma.session.findUnique({
                        where: { token: trimmedToken },
                        include: { user: true }
                    });
                    if (dbSession && dbSession.expiresAt > new Date() && dbSession.user?.email) {
                        userEmail = dbSession.user.email;
                        userId = dbSession.user.id;
                    }
                }
                catch {
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
            }
            catch {
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
        const betterAuthUser = await prisma.user.findUnique({
            where: { email: userEmail }
        }).catch(() => null);
        let fetchEmail = await prisma.users.findUnique({
            where: { email: userEmail },
            include: {
                projects: {
                    include: {
                        transactions: {
                            include: {
                                Logs: {
                                    select: { transaction_bank: true },
                                    orderBy: { created_at: "desc" },
                                    take: 1,
                                },
                            },
                            orderBy: { created_at: "desc" },
                        },
                    },
                },
                revenues: {
                    orderBy: {
                        time_stamp: "desc",
                    },
                },
            },
        });
        // If user logged in through Better Auth but has not been populated in Users table yet
        if (!fetchEmail) {
            const finalUserId = userId || betterAuthUser?.id || crypto.randomUUID();
            const freeQuota = Number(process.env.FREE_REQUESTS || 200);
            fetchEmail = await prisma.users.create({
                data: {
                    id: finalUserId,
                    full_name: betterAuthUser?.name || "Yegna Developer",
                    email: userEmail,
                    avatar_url: betterAuthUser?.image || "",
                    Provider: "better-auth",
                    account_status: "active",
                    payment_plan: "free",
                    verified: true,
                    request_available: freeQuota,
                    free_requests_remaining: freeQuota,
                    free_requests_used: 0,
                    paid_requests_balance: 0,
                    paid_requests_used: 0
                },
                include: {
                    projects: {
                        include: {
                            transactions: {
                                include: {
                                    Logs: {
                                        select: { transaction_bank: true },
                                        orderBy: { created_at: "desc" },
                                        take: 1,
                                    },
                                },
                                orderBy: { created_at: "desc" },
                            },
                        },
                    },
                    revenues: {
                        orderBy: {
                            time_stamp: "desc",
                        },
                    },
                },
            });
        }
        if (betterAuthUser) {
            const githubFromAccount = await resolveGithubUsername(betterAuthUser.id);
            const githubFromName = inferGithubHandleFromName(betterAuthUser.name);
            const githubUsername = githubFromAccount || githubFromName;
            const oauthName = (betterAuthUser.name || "").trim();
            const preferredName = githubUsername ||
                (!isGenericDisplayName(oauthName) ? oauthName : "") ||
                (!isGenericDisplayName(fetchEmail.full_name) ? fetchEmail.full_name : oauthName) ||
                fetchEmail.full_name;
            const preferredAvatar = (betterAuthUser.image || fetchEmail.avatar_url || "").trim();
            const provider = fetchEmail.Provider && fetchEmail.Provider !== "better-auth"
                ? fetchEmail.Provider
                : githubUsername
                    ? "github"
                    : fetchEmail.Provider || "better-auth";
            const shouldUpdateProfile = (preferredName && preferredName !== fetchEmail.full_name) ||
                (preferredAvatar && preferredAvatar !== (fetchEmail.avatar_url || "")) ||
                (provider !== fetchEmail.Provider);
            if (shouldUpdateProfile) {
                fetchEmail = await prisma.users.update({
                    where: { id: fetchEmail.id },
                    data: {
                        full_name: preferredName,
                        avatar_url: preferredAvatar || fetchEmail.avatar_url,
                        Provider: provider,
                    },
                    include: {
                        projects: {
                            include: {
                                transactions: {
                                    include: {
                                        Logs: {
                                            select: { transaction_bank: true },
                                            orderBy: { created_at: "desc" },
                                            take: 1,
                                        },
                                    },
                                    orderBy: { created_at: "desc" },
                                },
                            },
                        },
                        revenues: {
                            orderBy: {
                                time_stamp: "desc",
                            },
                        },
                    },
                });
            }
            fetchEmail.github_username = githubUsername || inferGithubHandleFromName(fetchEmail.full_name);
        }
        if (!fetchEmail.avatar_url && betterAuthUser?.image) {
            fetchEmail.avatar_url = betterAuthUser.image;
        }
        if (fetchEmail.account_status !== "active") {
            return res.status(403).json({
                status: 403,
                message: "This account is disabled. Please contact support."
            });
        }
        await ensureWelcomeNotification(fetchEmail.id).catch(() => { });
        const issuedToken = JWTGenerate({
            id: fetchEmail.id,
            email: fetchEmail.email
        }, "7d");
        return res.status(200).json({
            status: 200,
            fetchEmail,
            token: issuedToken.message
        });
    }
    catch (err) {
        console.error("Auth check error:", err?.message || err);
        return res.status(500).json({
            status: 500,
            message: "Internal server error verifying authentication session."
        });
    }
});
export default router;
//# sourceMappingURL=auth-check.js.map