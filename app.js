import Express from "express";
import cors from 'cors';
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
// ------------------------------- //
const app = Express();
app.use(cors({
    origin: [process.env.CLIENT_URL, "https://admin-yegna-pay.vercel.app"],
    credentials: true
}));
app.use(Express.json());
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
// user related route //
app.use("/api/transaction/create", transactionCreate);
app.use(errorMiddleware);
app.use(RateLimiter);
export default app;
//# sourceMappingURL=app.js.map