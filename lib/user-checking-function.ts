import { prisma } from "../lib/prisma.js"
export const UserCheckFunction = async (userEmail: string) => {
    const CheckUserEmail = await prisma.users.findFirst({
        where: {
            email: userEmail
        }
    })
    if (CheckUserEmail) {
        return {
            status: 400,
            message: "Email Already Exist",
            user: CheckUserEmail
        }
    } else {
        return {
            status: 200,
            message: "Success Fully Created"
        }
    }
}
