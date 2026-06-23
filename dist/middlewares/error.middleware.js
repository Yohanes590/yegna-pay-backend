import { ErrorPage } from "../service/error-page-display.js";
export const errorMiddleware = ((err, req, res, next) => {
    // console.error(err.stack);
    res.status(500).send(err);
});
//# sourceMappingURL=error.middleware.js.map