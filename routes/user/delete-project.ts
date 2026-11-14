import { Router, type NextFunction, type Request, type Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { prisma } from "../../lib/prisma.js";
import { VerifyToken } from "../../lib/JWT-generate.js";
import { auth } from "../../lib/auth.js";
import { buildErrorResponse } from "../../src/utils/error-registry.js";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    const { project_id, user_token, token } = req.body;
    const clientToken = user_token || token;
    let resolvedUserId: string | null = null;

    if (clientToken && typeof clientToken === "string" && clientToken.trim() !== "") {
        const decode = VerifyToken(clientToken);
        if (decode.status === 200 && decode.message?.id) {
            resolvedUserId = decode.message.id;
        }
    }

    if (!resolvedUserId) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers)
            });
            if (session?.user?.email) {
                const dbUser = await prisma.users.findUnique({
                    where: { email: session.user.email }
                });
                if (dbUser?.id) {
                    resolvedUserId = dbUser.id;
                }
            }
        } catch {
            // session check failed
        }
    }

    if (!resolvedUserId) {
        const errPayload = buildErrorResponse("UNAUTHORIZED", {
            message: "Unauthorized token. Please sign in again.",
        });
        return res.status(errPayload.status).json(errPayload);
    }

    try {
        const deletingProject = await prisma.projects.delete({
            where: {
                id: project_id
            }
        });
        return res.status(200).json({
            message: "Project deleted successfully",
            data: deletingProject,
            success: true
        });
    } catch (error: any) {
        return next(error);
    }
});

export default router;
