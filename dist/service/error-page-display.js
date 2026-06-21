import fs from "fs";
import path from "path";
// process.cwd() is always the root /backend folder on both local dev and Render production
const htmlPath = path.join(process.cwd(), "error-page.html");
export const ErrorPage = fs.readFileSync(htmlPath, "utf-8");
//# sourceMappingURL=error-page-display.js.map