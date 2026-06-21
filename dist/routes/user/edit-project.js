import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { VerifyToken } from "../../lib/JWT-generate.js";
const router = Router();
router.post("/", async (req, res) => {
    const { token, updatedData, id } = req.body;
    const TokenVerification = VerifyToken(token);
    const updatedDataLength = Object.keys(updatedData).length;
    if (!token) {
        return res.status(401).json({
            message: "Unauthorized user",
            success: false,
        });
    }
    else if (updatedDataLength != 6) {
        return res.status(400).json({
            message: "you are trying malicious access!",
            success: false,
        });
    }
    else if (updatedData.project_name == "" ||
        updatedData.api_sec_key == "" ||
        updatedData.call_back_url == "" ||
        updatedData.project_description == "" ||
        updatedData.before_expires == "") {
        return res.status(400).json({
            message: "pleas fill empty spaces!",
            success: false,
        });
    }
    else if (TokenVerification.status == 200) {
        await prisma.projects.update({
            where: {
                id: id,
            },
            data: updatedData,
        });
        return res.status(200).json({
            success: true,
            message: "data successfully updated",
        });
    }
    else {
        return res.status(400).json({
            message: "can't update project!",
            success: false,
        });
    }
});
export default router;
//# sourceMappingURL=edit-project.js.map