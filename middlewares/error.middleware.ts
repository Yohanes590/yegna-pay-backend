import { ErrorPage } from "../service/error-page-display.js";
export const errorMiddleware = ((err: any, req: any, res: any, next: any) => {
    // console.error(err.stack);
    res.status(500).send(err);
});