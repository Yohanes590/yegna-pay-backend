import { prisma } from "./prisma.js";
const merchantUserIncludeFull = {
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
};
const merchantUserIncludeLight = {
    projects: true,
    revenues: {
        orderBy: {
            time_stamp: "desc",
        },
    },
};
export async function loadMerchantUserByEmail(email) {
    try {
        return await prisma.users.findUnique({
            where: { email },
            include: merchantUserIncludeFull,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[loadMerchantUserByEmail] full include failed, using light query:", message);
        return prisma.users.findUnique({
            where: { email },
            include: merchantUserIncludeLight,
        });
    }
}
//# sourceMappingURL=load-merchant-user.js.map