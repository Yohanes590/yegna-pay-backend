import { chromium } from "playwright";
import * as cheerio from "cheerio";
function parseBOAReceipt(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const result = {};
    const keyMapping = {
        "transferred amount": "transferredAmount",
        "amount": "transferredAmount",
        "receiver's account": "receiverAccount",
        "receiver account": "receiverAccount",
        "beneficiary account": "receiverAccount",
        "beneficiary's account": "receiverAccount",
        "receiver's name": "receiverName",
        "receiver name": "receiverName",
        "beneficiary name": "receiverName",
        "beneficiary's name": "receiverName",
        "source account name": "senderName",
        "payer": "senderName",
        "payer name": "senderName",
        "sender name": "senderName",
        "sender's name": "senderName",
        "transaction date": "transactionDate",
        "transaction type": "transactionType",
        "transaction reference": "transactionReference",
        "narrative": "narrative"
    };
    $('table tr').each((_, element) => {
        const cells = $(element).find('td, th');
        if (cells.length < 2)
            return;
        const rawKey = cells.eq(0).text().replace(/:$/, "").trim().replace(/\s+/g, " ").toLowerCase();
        const value = cells.eq(1).text().trim();
        const targetField = keyMapping[rawKey];
        if (targetField && !result[targetField]) {
            result[targetField] = value;
        }
    });
    return result;
}
async function launchBrowser() {
    const defaultArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
    // 1. Try system Google Chrome
    try {
        return await chromium.launch({ channel: 'chrome', headless: true, args: defaultArgs });
    }
    catch {
        // Fallback to next option
    }
    // 2. Try system Microsoft Edge
    try {
        return await chromium.launch({ channel: 'msedge', headless: true, args: defaultArgs });
    }
    catch {
        // Fallback to next option
    }
    // 3. Fallback to default Playwright chromium binary
    return await chromium.launch({ headless: true, args: defaultArgs });
}
export async function BOAReadingPDF(transactionData) {
    const rawDomain = process.env.BOA_DOMAIN || "https://cs.bankofabyssinia.com/";
    const normalizedDomain = rawDomain.endsWith("/") ? rawDomain : `${rawDomain}/`;
    let boa_link;
    if (transactionData.transaction_url && (transactionData.transaction_url.startsWith("http://") || transactionData.transaction_url.startsWith("https://"))) {
        boa_link = transactionData.transaction_url;
    }
    else {
        boa_link = `${normalizedDomain}slip/?trx=${transactionData.transaction_id.replace(/^\?trx=/i, "")}`;
    }
    const browser = await launchBrowser();
    try {
        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        });
        const page = await context.newPage();
        await page.goto(boa_link, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(5000);
        const html = await page.content();
        await context.close();
        const parsedData = parseBOAReceipt(html);
        return parsedData;
    }
    catch (error) {
        console.error("BOA Scraper failed processing transaction ID:", transactionData.transaction_id, error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=BOA-reader.js.map