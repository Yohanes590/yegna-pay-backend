import { prisma } from "../lib/prisma.js";
export async function UserRequestAmount(userId) {
    const user = await prisma.users.findUnique({
        where: { id: userId }
    });
    if (!user) {
        return {
            message: "User not found.",
            success: false
        };
    }
    const totalAvailable = (user.free_requests_remaining ?? 0) + (user.paid_requests_balance ?? 0);
    const legacyAvailable = user.request_available ?? 0;
    if (totalAvailable <= 0 && legacyAvailable <= 0) {
        return {
            message: "Insufficient verification request quota. Please purchase additional requests.",
            success: false,
            free_remaining: user.free_requests_remaining ?? 0,
            paid_balance: user.paid_requests_balance ?? 0
        };
    }
    return {
        message: "Request quota verified successfully.",
        success: true,
        free_remaining: user.free_requests_remaining ?? 0,
        paid_balance: user.paid_requests_balance ?? 0
    };
}
export async function deductUserRequestCredit(userId) {
    return await prisma.$transaction(async (tx) => {
        const user = await tx.users.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return { success: false, message: "User not found." };
        }
        // Deduct from free requests first
        if ((user.free_requests_remaining ?? 0) > 0) {
            await tx.users.update({
                where: { id: userId },
                data: {
                    free_requests_remaining: { decrement: 1 },
                    free_requests_used: { increment: 1 },
                    request_available: { decrement: 1 }
                }
            });
            return { success: true, type: "free" };
        }
        // When free quota is exhausted, deduct from paid balance
        if ((user.paid_requests_balance ?? 0) > 0) {
            await tx.users.update({
                where: { id: userId },
                data: {
                    paid_requests_balance: { decrement: 1 },
                    paid_requests_used: { increment: 1 },
                    request_available: { decrement: 1 }
                }
            });
            return { success: true, type: "paid" };
        }
        return {
            success: false,
            message: "Insufficient verification credits. Please top up your balance."
        };
    });
}
//# sourceMappingURL=request-checker.js.map