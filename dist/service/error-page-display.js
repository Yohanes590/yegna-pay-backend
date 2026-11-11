import fs from "fs";
import path from "path";
function getErrorPageHtml() {
    const candidates = [
        path.join(process.cwd(), "error-page.html"),
        path.join(process.cwd(), "backend", "error-page.html"),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return fs.readFileSync(p, "utf-8");
        }
    }
    return "<h1>Server Error</h1><p>An unexpected error occurred.</p>";
}
export const ErrorPage = getErrorPageHtml();
//# sourceMappingURL=error-page-display.js.map