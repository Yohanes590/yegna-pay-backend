import { chromium } from "playwright";
import * as cheerio from "cheerio";
export function parseAwashReceipt(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const result = {};
    const keyMapping = {
        "amount": "transferredAmount",
        "transferred amount": "transferredAmount",
        "paid amount": "transferredAmount",
        "transaction amount": "transferredAmount",
        "debit amount": "transferredAmount",
        "total amount": "transferredAmount",
        "beneficiary account": "receiverAccount",
        "receiver account": "receiverAccount",
        "credited account": "receiverAccount",
        "account number": "receiverAccount",
        "to account": "receiverAccount",
        "account no": "receiverAccount",
        "beneficiary name": "receiverName",
        "receiver name": "receiverName",
        "credited to": "receiverName",
        "account name": "receiverName",
        "customer name": "receiverName",
        "account holder": "receiverName",
        "to": "receiverName",
        "transaction time": "transactionDate",
        "transaction date": "transactionDate",
        "payment date": "transactionDate",
        "payment time": "transactionDate",
        "date & time": "transactionDate",
        "date": "transactionDate",
        "time": "transactionDate",
        "transaction type": "transactionType",
        "payment type": "transactionType",
        "transaction id": "transactionReference",
        "transaction reference": "transactionReference",
        "reference number": "transactionReference",
        "reference no": "transactionReference",
        "reference": "transactionReference",
        "ref no": "transactionReference",
        "txn id": "transactionReference",
        "reason": "narrative",
        "narrative": "narrative",
        "remark": "narrative",
        "remarks": "narrative",
        "description": "narrative",
        "vat": "vat",
        "sender name": "senderName",
        "payer name": "senderName",
        "debited from": "senderName",
        "from": "senderName",
        "beneficiary bank": "beneficiaryBank",
        "status": "status",
        "payment status": "status",
        "transaction status": "status"
    };
    $('table tr').each((_, element) => {
        const cells = $(element).find('td, th');
        if (cells.length < 2)
            return;
        const rawKey = cells.eq(0).text().replace(/[:\t\n]+/g, ' ').trim().toLowerCase();
        let value = '';
        if (cells.length >= 3 && cells.eq(1).text().trim() === ':') {
            value = cells.eq(2).text().trim();
        }
        else {
            value = cells.eq(1).text().trim();
            if (value.startsWith(':')) {
                value = value.substring(1).trim();
            }
        }
        if (keyMapping[rawKey]) {
            result[keyMapping[rawKey]] = value;
        }
    });
    // Check definition lists if present
    $('dl dt').each((_, element) => {
        const rawKey = $(element).text().replace(/[:\t\n]+/g, ' ').trim().toLowerCase();
        const value = $(element).next('dd').text().trim();
        if (keyMapping[rawKey] && value) {
            result[keyMapping[rawKey]] = value;
        }
    });
    // Regex fallbacks on the raw text if essential fields are still missing
    const text = $.text();
    if (!result.transferredAmount) {
        const amountMatch = text.match(/(?:transferred\s*amount|paid\s*amount|amount|total)\s*[:=]?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:etb|birr)?/i);
        if (amountMatch && amountMatch[1]) {
            result.transferredAmount = amountMatch[1].replace(/,/g, '');
        }
    }
    if (!result.receiverAccount) {
        const accountMatch = text.match(/(?:beneficiary\s*account|account\s*(?:number|no)|credited\s*account)\s*[:=]?\s*([0-9]{10,20})/i);
        if (accountMatch && accountMatch[1]) {
            result.receiverAccount = accountMatch[1].trim();
        }
    }
    if (!result.receiverName) {
        const nameMatch = text.match(/(?:beneficiary\s*name|receiver\s*name|credited\s*to)\s*[:=]?\s*([A-Za-z\s]{3,40})/i);
        if (nameMatch && nameMatch[1]) {
            result.receiverName = nameMatch[1].trim();
        }
    }
    if (!result.transactionReference) {
        const refMatch = text.match(/(?:transaction\s*id|reference\s*(?:number|no)?|ref\s*no)\s*[:=]?\s*([A-Za-z0-9\-_]{6,30})/i);
        if (refMatch && refMatch[1]) {
            result.transactionReference = refMatch[1].trim();
        }
    }
    if (!result.transactionDate) {
        const dateMatch = text.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?)\b/i);
        if (dateMatch && dateMatch[1]) {
            result.transactionDate = dateMatch[1].trim();
        }
    }
    if (!result.status) {
        if (/successful|completed|cleared|approved/i.test(text)) {
            result.status = "SUCCESS";
        }
        else if (/failed|declined|rejected|cancelled/i.test(text)) {
            result.status = "FAILED";
        }
    }
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
        await page.waitForTimeout(2000);
        const html = await page.content();
        await context.close();
        return parseAwashReceipt(html);
    }
    catch (error) {
        console.error("Awash Scraper failed processing transaction ID:", transactionData.transaction_id, error?.message || error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=Awash-bank.js.map