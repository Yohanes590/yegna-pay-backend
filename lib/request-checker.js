import { prisma } from "../lib/prisma.js";
export async function UserRequestAmount(userId) {
    const userRequestAmount = await prisma.users.findFirst({
        where: {
            id: userId
        }
    });
    if (userRequestAmount?.request_available == 0) {
        return {
            message: "in sufficient request amount",
            success: false
        };
    }
    else {
        return {
            message: "success request amount checked!",
            success: true
        };
    }
}
//# sourceMappingURL=request-checker.js.map