import Express from "express";
import cors from 'cors';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
// --------- importing routes  -------//    
import thirdParty from "./routes/auth/third-party.js";
import emailSignup from "./routes/auth/auth-email-signup.js";
import authCheck from "./routes/auth/auth-check.js";
import verifyToken from "./routes/auth/auth-verify-token.js";
import googleCallback from "./routes/google-callback.js";
import userCreate from "./routes/user/user-create-project.js";
import transactionCreate from "./routes/transaction/api-transaction-create.js";
import login from "./routes/auth/login.js";
import githubCallback from "./routes/github-callback.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { RateLimiter } from "./middlewares/rate.limit.js";
import deleteProject from "./routes/user/delete-project.js";
import editProject from "./routes/user/edit-project.js";
import CroneJob from "./routes/crone-job.js";
import BuyRequest from './routes/user/buy-request.js';
import qrImagesRouter from "./routes/user/qr-images.js";
// ------------------------------- //
const app = Express();
const rawClientUrls = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);
const clientUrl = rawClientUrls[0] || "http://localhost:3000";
const defaultCors = cors({
    origin: Array.from(new Set([...rawClientUrls, "http://localhost:3000", "https://admin-yegna-pay.vercel.app"])),
    credentials: true
});
const transactionCreateCors = cors({
    origin: "*",
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "X-Requested-With", "Accept"]
});
app.use((req, res, next) => {
    const normalizedPath = req.path.replace(/\/+$/, "") || "/";
    if (normalizedPath === "/api/transaction-create") {
        return transactionCreateCors(req, res, next);
    }
    return defaultCors(req, res, next);
});
// Mount Better Auth directly on the backend
app.all(["/api/auth", "/api/auth/*splat"], toNodeHandler(auth));
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(RateLimiter);
app.get("/", (req, res) => {
    res.json({
        message: "Yegna server is alive",
        status: 200
    });
});
app.get("/dashboard", (req, res) => {
    res.redirect(`${clientUrl}/dashboard`);
});
app.use("/crone-job-db-activator", CroneJob);
app.use("/auth/third-party", thirdParty);
app.use("/auth/email-signup", emailSignup);
app.use("/auth/check", authCheck);
app.use("/auth/verify-token", verifyToken);
app.use("/callback/google", googleCallback);
app.use("/callback/github", githubCallback);
app.use("/auth/login", login);
// user related route
app.use("/user/create-project", userCreate);
app.use("/user/delete-project", deleteProject);
app.use("/user/edit-project", editProject);
app.use("/user/buy-request", BuyRequest);
app.use("/qr-images", qrImagesRouter);
// user related route //
app.use("/api/transaction-create", transactionCreate);
app.use(errorMiddleware);
export default app;
//# sourceMappingURL=app.js.map