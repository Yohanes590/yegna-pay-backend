import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { resolveAuthenticatedUserId } from "../../lib/resolve-session-user.js";
import { getUserNotifications, markUserNotificationsAsRead, clearUserNotifications, } from "../../lib/notification-service.js";
const router = Router();
async function resolveAuthenticatedUser(req) {
    const userId = await resolveAuthenticatedUserId(req);
    if (!userId)
        return null;
    return prisma.users.findUnique({ where: { id: userId } });
}
// GET /api/user/notifications
router.get("/", async (req, res, next) => {
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
    }
    catch (err) {
        return next(err);
    }
});
// PATCH /api/user/notifications - mark all read
router.patch("/", async (req, res, next) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        await markUserNotificationsAsRead(user.id);
        return res.status(200).json({ success: true, message: "Marked all notifications as read." });
    }
    catch (err) {
        return next(err);
    }
});
// DELETE /api/user/notifications - clear all
router.delete("/", async (req, res, next) => {
    try {
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        await clearUserNotifications(user.id);
        return res.status(200).json({ success: true, message: "Cleared all notifications." });
    }
    catch (err) {
        return next(err);
    }
});
export default router;
//# sourceMappingURL=notifications.js.map