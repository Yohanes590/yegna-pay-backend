import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { resolveAuthenticatedUserId } from "../../lib/resolve-session-user.js";
import { buildErrorResponse } from "../../src/utils/error-registry.js";
const router = Router();
router.post("/", async (req, res, next) => {
    const project_id = (typeof req.body?.project_id === "string" && req.body.project_id.trim()) ||
        (typeof req.body?.id === "string" && req.body.id.trim()) ||
        "";
    const resolvedUserId = await resolveAuthenticatedUserId(req);
    if (!resolvedUserId) {
        const errPayload = buildErrorResponse("UNAUTHORIZED", {
            message: "Unauthorized token. Please sign in again.",
        });
        return res.status(errPayload.status).json(errPayload);
    }
    if (!project_id) {
        const errPayload = buildErrorResponse("MISSING_REQUIRED_FIELD", {
            message: "Project id is required (project_id or id).",
        });
        return res.status(errPayload.status).json(errPayload);
    }
    try {
        const owned = await prisma.projects.findFirst({
            where: { id: project_id, user_Id: resolvedUserId },
            select: { id: true, project_name: true },
        });
        if (!owned) {
            const errPayload = buildErrorResponse("PROJECT_NOT_FOUND", {
                message: "Workspace not found or you do not have permission to delete it.",
            });
            return res.status(errPayload.status).json(errPayload);
        }
        const deletingProject = await prisma.projects.delete({
            where: { id: project_id },
        });
        return res.status(200).json({
            message: "Project deleted successfully",
            data: deletingProject,
            success: true,
        });
    }
    catch (error) {
        const code = error?.code;
        if (code === "P2025") {
            const errPayload = buildErrorResponse("PROJECT_NOT_FOUND", {
                message: "Workspace not found.",
            });
            return res.status(errPayload.status).json(errPayload);
        }
        return next(error);
    }
});
export default router;
//# sourceMappingURL=delete-project.js.map