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
app.set('trust proxy', 1);
const rawClientUrls = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);
const clientUrl = rawClientUrls[0] || "http://localhost:3000";
const allowedOrigins = Array.from(new Set([
    ...rawClientUrls,
    "http://localhost:3000",
    "https://admin-yegna-pay.vercel.app",
    "https://yegna-pay.vercel.app",
]));
const defaultCors = cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            origin.endsWith(".vercel.app") ||
            origin.endsWith(".yonas.cloud")) {
            return callback(null, true);
        }
        return callback(null, true);
    },
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
// Intercept Better Auth OAuth callback redirect to attach session token for cross-domain clients
app.use((req, res, next) => {
    const isAuthCallback = req.path.startsWith("/api/auth/callback");
    if (isAuthCallback) {
        const originalWriteHead = res.writeHead.bind(res);
        res.writeHead = function (statusCode, ...args) {
            try {
                const location = res.getHeader("location");
                if (location && typeof location === "string" && (statusCode === 302 || statusCode === 301)) {
                    const setCookieHeader = res.getHeader("set-cookie");
                    let sessionToken = null;
                    if (setCookieHeader) {
                        const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join("; ") : String(setCookieHeader);
                        const match = cookieStr.match(/(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/);
                        if (match && match[1]) {
                            const rawPart = decodeURIComponent(match[1]).split(".")[0];
                            if (rawPart)
                                sessionToken = rawPart;
                        }
                    }
                    if (sessionToken) {
                        try {
                            const parsedUrl = new URL(location, "http://localhost");
                            if (!parsedUrl.searchParams.has("token")) {
                                parsedUrl.searchParams.set("token", sessionToken);
                                const newLocation = location.startsWith("http")
                                    ? parsedUrl.toString()
                                    : `${parsedUrl.pathname}${parsedUrl.search}`;
                                res.setHeader("location", newLocation);
                            }
                        }
                        catch {
                            const sep = location.includes("?") ? "&" : "?";
                            res.setHeader("location", `${location}${sep}token=${encodeURIComponent(sessionToken)}`);
                        }
                    }
                }
            }
            catch (err) {
                console.error("Callback location rewrite error:", err);
            }
            return originalWriteHead(statusCode, ...args);
        };
    }
    next();
});
// Mount Better Auth directly on the backend
app.all(["/api/auth", "/api/auth/*splat"], toNodeHandler(auth));
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(RateLimiter);
app.get("/", (req, res) => {
    if (req.query.error) {
        return res.redirect(`${clientUrl}/sign-in?error=${encodeURIComponent(String(req.query.error))}`);
    }
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