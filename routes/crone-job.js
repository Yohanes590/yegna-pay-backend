import { Router } from "express";
import { prisma } from "../lib/prisma.js";
const router = Router();
router.get("/", async (req, res) => {
    console.log("checking NeonDB Connection ....");
    const DBResponse = await prisma.databaseCronJob.findUnique({
        where: {
            id: "Neon001"
        }
    });
    const time = new Date();
    console.log(`DataBaseStatus ${DBResponse?.CronJob} , ${time.getTime()}`);
    return res.status(200).json({
        health: "200 Status Server Health 🚀",
        timeStamp: time.getTime(),
        DBResponse: DBResponse?.CronJob
    });
});
export default router;
//# sourceMappingURL=crone-job.js.map