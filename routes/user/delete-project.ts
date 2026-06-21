import { Router } from "express";
import { prisma } from "../../lib/prisma.js"
import { VerifyToken } from "../../lib/JWT-generate.js";
const router = Router()


router.post("/", async (req, res) => {
    const { project_id, user_token } = req.body
    try {
        const decodeToken = await VerifyToken(user_token)
        if (decodeToken.status == 200) {
            const DeletingProject = await prisma.projects.delete({
                where: {
                    id: project_id
                }
            })
            return res.status(200).json({
                message: "project deleted successfully",
                data: DeletingProject,
                success: true
            })
        } else {
            return res.status(400).json({
                message: "Unauthorized User",
                data: null,
                success: false
            })
        }

    } catch (error: any) {
        return res.status(500).json({
            message: "internal server error",
            error: error.message,
            data: null,
            success: false
        })
    }
})



export default router