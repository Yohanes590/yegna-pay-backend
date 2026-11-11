import { Router } from "express";
const router = Router();
router.get("/", async (req, res) => {
    console.log("checking NeonDB Connection ....");
    const time = new Date();
    return res.status(200).json({
        health: "200 Status Server Health 🚀",
        timeStamp: time.getTime(),
    });
});
export default router;
//# sourceMappingURL=crone-job.js.map