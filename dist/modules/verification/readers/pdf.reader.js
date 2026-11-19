import axios from "axios";
import pdf from "@cedrugs/pdf-parse";
import { assertSafeBankFetchUrl } from "../ssrf-guard.js";
import { bankConcurrency } from "../concurrency.js";
import { verificationLog } from "../structured-logger.js";
const DEFAULT_TIMEOUT_MS = Number(process.env.BANK_PDF_TIMEOUT_MS || "15000");
const MAX_PDF_BYTES = Number(process.env.BANK_PDF_MAX_BYTES || String(8 * 1024 * 1024));
export async function fetchAndParsePdf(url, allowedHostname) {
    return bankConcurrency.pdf.run(async () => {
        const safeUrl = await assertSafeBankFetchUrl(url, allowedHostname);
        verificationLog.debug("pdf_fetch_start", { host: safeUrl.hostname });
        const response = await axios.get(safeUrl.toString(), {
            responseType: "arraybuffer",
            timeout: DEFAULT_TIMEOUT_MS,
            maxContentLength: MAX_PDF_BYTES,
            maxBodyLength: MAX_PDF_BYTES,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            validateStatus: (status) => status >= 200 && status < 400,
        });
        const buffer = Buffer.from(response.data);
        if (buffer.byteLength === 0) {
            throw new Error("Bank returned an empty PDF document.");
        }
        if (buffer.byteLength > MAX_PDF_BYTES) {
            throw new Error("PDF document exceeds the maximum allowed size.");
        }
        const parsed = await pdf(buffer);
        const text = typeof parsed.text === "string" ? parsed.text : "";
        if (!text.trim()) {
            throw new Error("Could not extract text from bank PDF.");
        }
        return { buffer, text };
    });
}
//# sourceMappingURL=pdf.reader.js.map