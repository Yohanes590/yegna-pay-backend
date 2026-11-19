import axios from "axios";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import { assertSafeBankFetchUrl } from "../ssrf-guard.js";
import { bankConcurrency } from "../concurrency.js";
import { verificationLog } from "../structured-logger.js";
const DEFAULT_HTTP_TIMEOUT_MS = Number(process.env.BANK_WEB_TIMEOUT_MS || "20000");
const MAX_HTML_BYTES = Number(process.env.BANK_HTML_MAX_BYTES || String(4 * 1024 * 1024));
const BROWSER_NAV_TIMEOUT_MS = Number(process.env.BANK_BROWSER_TIMEOUT_MS || "30000");
export async function fetchHtmlViaHttp(url, allowedHostname) {
    return bankConcurrency.web.run(async () => {
        const safeUrl = await assertSafeBankFetchUrl(url, allowedHostname);
        verificationLog.debug("web_http_fetch_start", { host: safeUrl.hostname });
        const response = await axios.get(safeUrl.toString(), {
            responseType: "text",
            timeout: DEFAULT_HTTP_TIMEOUT_MS,
            maxContentLength: MAX_HTML_BYTES,
            maxBodyLength: MAX_HTML_BYTES,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
            validateStatus: (status) => status >= 200 && status < 400,
        });
        const html = typeof response.data === "string" ? response.data : String(response.data ?? "");
        if (!html.trim()) {
            throw new Error("Bank returned an empty HTML page.");
        }
        return html;
    });
}
async function launchBrowser() {
    const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
    try {
        return await chromium.launch({ channel: "chrome", headless: true, args: defaultArgs });
    }
    catch {
        try {
            return await chromium.launch({ channel: "msedge", headless: true, args: defaultArgs });
        }
        catch {
            return await chromium.launch({ headless: true, args: defaultArgs });
        }
    }
}
export async function fetchHtmlViaBrowser(url, allowedHostname) {
    return bankConcurrency.browser.run(async () => {
        const safeUrl = await assertSafeBankFetchUrl(url, allowedHostname);
        verificationLog.debug("web_browser_fetch_start", { host: safeUrl.hostname });
        const browser = await launchBrowser();
        try {
            const context = await browser.newContext({
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            });
            const page = await context.newPage();
            await page.goto(safeUrl.toString(), { waitUntil: "networkidle", timeout: BROWSER_NAV_TIMEOUT_MS });
            await page.waitForTimeout(1500);
            const html = await page.content();
            await context.close();
            if (!html.trim()) {
                throw new Error("Bank page did not render any content.");
            }
            return html;
        }
        finally {
            await browser.close();
        }
    });
}
/** Quick sanity check that HTML looks like a receipt page (not a generic error). */
export function htmlLooksLikeReceipt(html) {
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ").toLowerCase();
    if (!text || text.length < 40)
        return false;
    return /amount|transaction|reference|receiver|beneficiary/.test(text);
}
//# sourceMappingURL=web.reader.js.map