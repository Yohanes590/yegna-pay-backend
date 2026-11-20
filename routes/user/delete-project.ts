import { Router, type NextFunction, type Request, type Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { resolveAuthenticatedUserId } from "../../lib/resolve-session-user.js";
import { buildErrorResponse } from "../../src/utils/error-registry.js";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    const { project_id } = req.body;
    const resolvedUserId = await resolveAuthenticatedUserId(req);

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
