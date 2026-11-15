import { Router, type Request, type Response, type NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { VerifyToken } from "../../lib/JWT-generate.js";
import { prisma } from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import {
    getUserNotifications,
    markUserNotificationsAsRead,
    clearUserNotifications,
} from "../../lib/notification-service.js";

const router = Router();

async function resolveAuthenticatedUser(req: any) {
    const authHeader = req.headers.authorization;
    const clientToken = req.body?.token || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader);
    let userEmail: string | null = null;
    let userId: string | null = null;

    if (clientToken && typeof clientToken === "string" && clientToken.trim() !== "") {
        const decoded = VerifyToken(clientToken.trim());
        if (decoded.status === 200 && decoded.message?.email) {
            userEmail = decoded.message.email;
            userId = decoded.message.id;
        } else {
            try {
                const dbSession = await prisma.session.findUnique({
                    where: { token: clientToken.trim() },
                    include: { user: true },
                });
                if (dbSession && dbSession.expiresAt > new Date() && dbSession.user?.email) {
                    userEmail = dbSession.user.email;
                    userId = dbSession.user.id;
                }
            } catch {
                // ignore
            }
        }
    }

    if (!userEmail) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers),
            });
            if (session?.user?.email) {
                userEmail = session.user.email;
                userId = session.user.id;
            }
        } catch {
            // ignore
        }
    }

    if (!userEmail) return null;

    return await prisma.users.findUnique({
        where: { email: userEmail },
    });
}

// GET /api/user/notifications
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized", notifications: [] });
        }

        const notifications = await getUserNotifications(user.id);
        return res.status(200).json({
            success: true,
            status: 200,
            notifications,
            unreadCount: notifications.filter((n) => !n.isRead).length,
        });
    } catch (err) {
        return next(err);
    }
});

// PATCH /api/user/notifications - mark all read
router.patch("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        await markUserNotificationsAsRead(user.id);
        return res.status(200).json({ success: true, message: "Marked all notifications as read." });
    } catch (err) {
        return next(err);
    }
});

// DELETE /api/user/notifications - clear all
router.delete("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        await clearUserNotifications(user.id);
        return res.status(200).json({ success: true, message: "Cleared all notifications." });
    } catch (err) {
        return next(err);
    }
});

export default router;
