import { chromium } from "playwright";
import * as cheerio from "cheerio";
function parseAwashReceipt(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const result = {};
    const keyMapping = {
        "amount": "transferredAmount",
        "beneficiary account": "receiverAccount",
        "beneficiary name": "receiverName",
        "transaction time": "transactionDate",
        "transaction type": "transactionType",
        "transaction id": "transactionReference",
        "reason": "narrative",
        "vat": "vat",
        "sender name": "senderName",
        "beneficiary bank": "beneficiaryBank"
    };
    $('table tbody tr').each((_, element) => {
        const tds = $(element).find('td');
        // Skip rows that don't have enough columns
        if (tds.length < 2)
            return;
        // Clean up the key label
        const rawKey = tds.eq(0).text().replace(':', '').trim().toLowerCase();
        let value = '';
        // If there are 3 columns and the 2nd one is just a colon separator, grab the 3rd column
        if (tds.length >= 3 && tds.eq(1).text().trim() === ':') {
            value = tds.eq(2).text().trim();
        }
        else {
            // Fallback for standard 2-column layout, stripping any leading colons from the value
            value = tds.eq(1).text().trim();
            if (value.startsWith(':')) {
                value = value.substring(1).trim();
            }
        }
        if (keyMapping[rawKey]) {
            result[keyMapping[rawKey]] = value;
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
export async function AwashbankReader(transactionData) {
    const rawDomain = process.env.AWASH_DOMAIN || "https://awashpay.awashbank.com:8225/";
    const normalizedDomain = rawDomain.endsWith("/") ? rawDomain : `${rawDomain}/`;
    let awashLink;
    if (transactionData.transaction_url && (transactionData.transaction_url.startsWith("http://") || transactionData.transaction_url.startsWith("https://"))) {
        awashLink = transactionData.transaction_url;
    }
    else {
        // If configured domain does not have port and is awashpay, append port 8225 if needed
        try {
            const parsed = new URL(normalizedDomain);
            if (!parsed.port && parsed.hostname.includes("awashpay.awashbank.com")) {
                parsed.port = "8225";
            }
            const cleanBase = parsed.toString().endsWith("/") ? parsed.toString() : `${parsed.toString()}/`;
            awashLink = `${cleanBase}${transactionData.transaction_id.replace(/^\//, "")}`;
        }
        catch {
            awashLink = `${normalizedDomain}${transactionData.transaction_id.replace(/^\//, "")}`;
        }
    }
    const browser = await launchBrowser();
    try {
        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        });
        const page = await context.newPage();
        await page.goto(awashLink, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(3000);
        const html = await page.content();
        await context.close();
        return parseAwashReceipt(html);
    }
    catch (error) {
        console.error("Awash Scraper failed processing transaction ID:", transactionData.transaction_id, error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=Awash-bank.js.map