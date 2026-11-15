import { prisma } from "./prisma.js";
export async function createNotification(params) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const notifData = {
        id: notifId,
        type: params.type,
        title: params.title,
        description: params.description,
        longDetails: params.longDetails,
        isRead: false,
        createdAt: nowIso,
    };
    try {
        await prisma.verification.create({
            data: {
                identifier: `notif:${params.userId}`,
                value: JSON.stringify(notifData),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            },
        });
    }
    catch (err) {
        console.error("Failed to persist notification:", err);
    }
    return notifData;
}
export async function ensureWelcomeNotification(userId) {
    try {
        const welcomeMarker = await prisma.verification.findFirst({
            where: { identifier: `welcome_seen:${userId}` },
        });
        if (!welcomeMarker) {
            // First time login - record marker so it NEVER triggers on subsequent logins
            await prisma.verification.create({
                data: {
                    identifier: `welcome_seen:${userId}`,
                    value: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
                },
            });
            // Create initial welcome notification
            await createNotification({
                userId,
                type: "info",
                title: "Welcome to Yegna Pay!",
                description: "Your merchant workspace is active with 200 free verification requests to start building.",
                longDetails: "Welcome to Yegna Pay automated transaction verification gateway. Connect your CBE, Awash, or BOA payment rails and start verifying merchant payments in real time.",
            });
        }
    }
    catch (err) {
        console.error("Failed to check or create welcome notification:", err);
    }
}
export async function getUserNotifications(userId) {
    // 1. Ensure first login welcome is created if not already seen
    await ensureWelcomeNotification(userId);
    // 2. Query all notification records from verification table
    try {
        const records = await prisma.verification.findMany({
            where: { identifier: `notif:${userId}` },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        const notifications = [];
        for (const record of records) {
            try {
                const parsed = JSON.parse(record.value);
                const createdAtDate = record.createdAt || (parsed.createdAt ? new Date(parsed.createdAt) : new Date());
                notifications.push({
                    ...parsed,
                    time: formatTimeAgo(new Date(createdAtDate)),
                });
            }
            catch {
                // ignore invalid json record
            }
        }
        return notifications;
    }
    catch (err) {
        console.error("Failed to fetch user notifications:", err);
        return [];
    }
}
export async function markUserNotificationsAsRead(userId) {
    try {
        const records = await prisma.verification.findMany({
            where: { identifier: `notif:${userId}` },
        });
        for (const record of records) {
            try {
                const parsed = JSON.parse(record.value);
                if (!parsed.isRead) {
                    parsed.isRead = true;
                    await prisma.verification.update({
                        where: { id: record.id },
                        data: { value: JSON.stringify(parsed) },
                    });
                }
            }
            catch {
                // ignore
            }
        }
    }
    catch (err) {
        console.error("Failed to mark notifications read:", err);
    }
}
export async function clearUserNotifications(userId) {
    try {
        await prisma.verification.deleteMany({
            where: { identifier: `notif:${userId}` },
        });
    }
    catch (err) {
        console.error("Failed to clear notifications:", err);
    }
}
function formatTimeAgo(date) {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60)
        return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
        return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24)
        return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}
//# sourceMappingURL=notification-service.js.map