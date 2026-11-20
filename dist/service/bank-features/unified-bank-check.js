import { fetchAndNormalizeViaAdapter } from "../../modules/verification/verification.service.js";
import { SaveTransactionData } from "../save-transaction.js";
export function normalizeBankReceiptName(name) {
    return String(name || "")
        .toLowerCase()
        .trim()
        .replace(/\.+$/, "")
        .replace(/\s+/g, " ");
}
export function parseNumericAmount(rawAmount) {
    const cleaned = String(rawAmount ?? "").replace(/[^0-9.]/g, "");
    if (!cleaned) {
        return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}
const ETHIOPIA_TZ_OFFSET = "+03:00";
const MONTH_NAME_MAP = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
};
function buildEthiopiaDate(year, month, day, hour = 0, minute = 0, second = 0) {
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return new Date(NaN);
    }
    const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}${ETHIOPIA_TZ_OFFSET}`;
    const parsed = new Date(iso);
    // Reject calendar rollovers such as 2026-02-30
    if (isNaN(parsed.getTime())) {
        return new Date(NaN);
    }
    const checkUtc = new Date(parsed.getTime() + 3 * 60 * 60 * 1000);
    if (checkUtc.getUTCFullYear() !== year ||
        checkUtc.getUTCMonth() + 1 !== month ||
        checkUtc.getUTCDate() !== day) {
        return new Date(NaN);
    }
    return parsed;
}
export function parseBankReceiptDate(rawDate) {
    if (!rawDate || typeof rawDate !== "string") {
        return new Date(NaN);
    }
    const trimmed = rawDate.trim();
    if (!trimmed || /^n\/?a$/i.test(trimmed)) {
        return new Date(NaN);
    }
    // 1. Date-only YYYY-MM-DD -> start of day in Ethiopia time (+03:00)
    const ymdOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdOnly && ymdOnly[1] && ymdOnly[2] && ymdOnly[3]) {
        return buildEthiopiaDate(Number(ymdOnly[1]), Number(ymdOnly[2]), Number(ymdOnly[3]));
    }
    // 2. Explicit timezone offset (Z or +/-HH:MM or +/-HHMM) -> exact instant
    if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
        const parsed = new Date(trimmed);
        return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
    }
    // 3. Naive ISO-like datetime YYYY-MM-DD[T ]HH:mm(:ss)?(.sss)? -> treat as Ethiopia time (+03:00)
    const naiveIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
    if (naiveIso && naiveIso[1] && naiveIso[2] && naiveIso[3] && naiveIso[4] && naiveIso[5]) {
        return buildEthiopiaDate(Number(naiveIso[1]), Number(naiveIso[2]), Number(naiveIso[3]), Number(naiveIso[4]), Number(naiveIso[5]), Number(naiveIso[6] || "0"));
    }
    // 4. Slash or dash numeric date + optional time/AM-PM (CBE: "11/1/2026, 2:15:30 PM", Awash: "11/01/2026 02:15:00 PM")
    const slashOrDash = trimmed.match(/^(\d{1,4})([-/])(\d{1,2})\2(\d{1,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
    if (slashOrDash && slashOrDash[1] && slashOrDash[3] && slashOrDash[4]) {
        const p1 = Number(slashOrDash[1]);
        const p2 = Number(slashOrDash[3]);
        const p3 = Number(slashOrDash[4]);
        let year;
        let month;
        let day;
        if (slashOrDash[1].length === 4) {
            year = p1;
            month = p2;
            day = p3;
        }
        else {
            year = p3 < 100 ? 2000 + p3 : p3;
            // Disambiguate DD/MM/YYYY vs MM/DD/YYYY safely
            if (p1 > 12) {
                day = p1;
                month = p2;
            }
            else {
                month = p1;
                day = p2;
            }
        }
        let hour = Number(slashOrDash[5] || "0");
        const minute = Number(slashOrDash[6] || "0");
        const second = Number(slashOrDash[7] || "0");
        const meridiem = slashOrDash[8]?.toUpperCase();
        if (meridiem === "PM" && hour < 12)
            hour += 12;
        if (meridiem === "AM" && hour === 12)
            hour = 0;
        const parsedNumeric = buildEthiopiaDate(year, month, day, hour, minute, second);
        if (!isNaN(parsedNumeric.getTime())) {
            return parsedNumeric;
        }
    }
    // 5. Named month formats (e.g. "01-Nov-2026 14:15:30", "Nov 1, 2026, 2:15 PM")
    const dayFirstMonth = trimmed.match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s,]+\s*(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
    if (dayFirstMonth && dayFirstMonth[1] && dayFirstMonth[2] && dayFirstMonth[3]) {
        const month = MONTH_NAME_MAP[dayFirstMonth[2].toLowerCase()];
        if (month) {
            let hour = Number(dayFirstMonth[4] || "0");
            const minute = Number(dayFirstMonth[5] || "0");
            const second = Number(dayFirstMonth[6] || "0");
            const meridiem = dayFirstMonth[7]?.toUpperCase();
            if (meridiem === "PM" && hour < 12)
                hour += 12;
            if (meridiem === "AM" && hour === 12)
                hour = 0;
            return buildEthiopiaDate(Number(dayFirstMonth[3]), month, Number(dayFirstMonth[1]), hour, minute, second);
        }
    }
    const monthFirst = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
    if (monthFirst && monthFirst[1] && monthFirst[2] && monthFirst[3]) {
        const month = MONTH_NAME_MAP[monthFirst[1].toLowerCase()];
        if (month) {
            let hour = Number(monthFirst[4] || "0");
            const minute = Number(monthFirst[5] || "0");
            const second = Number(monthFirst[6] || "0");
            const meridiem = monthFirst[7]?.toUpperCase();
            if (meridiem === "PM" && hour < 12)
                hour += 12;
            if (meridiem === "AM" && hour === 12)
                hour = 0;
            return buildEthiopiaDate(Number(monthFirst[3]), month, Number(monthFirst[2]), hour, minute, second);
        }
    }
    // 6. Fallback embedded YYYY-MM-DD (e.g. BOA text prefix)
    const isoPrefix = trimmed.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoPrefix && isoPrefix[1] && isoPrefix[2] && isoPrefix[3]) {
        return buildEthiopiaDate(Number(isoPrefix[1]), Number(isoPrefix[2]), Number(isoPrefix[3]));
    }
    return new Date(NaN);
}
export function getTodayEthiopiaDateString() {
    const eatNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return eatNow.toISOString().slice(0, 10);
}
export function normalizeProjectEligibilityDate(rawDate) {
    if (!rawDate || typeof rawDate !== "string") {
        return { valid: true, normalized: getTodayEthiopiaDateString() };
    }
    const trimmed = rawDate.trim();
    if (!trimmed || /^\d+[mh]$/i.test(trimmed)) {
        return { valid: true, normalized: getTodayEthiopiaDateString() };
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const parsed = parseBankReceiptDate(trimmed);
        return isNaN(parsed.getTime()) ? { valid: false, normalized: "" } : { valid: true, normalized: trimmed };
    }
    const parsed = parseBankReceiptDate(trimmed);
    if (isNaN(parsed.getTime())) {
        return { valid: false, normalized: "" };
    }
    return { valid: true, normalized: trimmed };
}
export function parseProjectEligibilityStartDate(rawRestriction) {
    if (rawRestriction === null || rawRestriction === undefined) {
        return { hasRestriction: false, startDate: null, valid: true };
    }
    if (rawRestriction instanceof Date) {
        return isNaN(rawRestriction.getTime())
            ? { hasRestriction: true, startDate: null, valid: false }
            : { hasRestriction: true, startDate: rawRestriction, valid: true };
    }
    const trimmed = String(rawRestriction).trim();
    if (!trimmed || /^\d+[mh]$/i.test(trimmed)) {
        // Empty or legacy relative placeholder does not encode a calendar cutoff date
        return { hasRestriction: false, startDate: null, valid: true };
    }
    const parsed = parseBankReceiptDate(trimmed);
    if (isNaN(parsed.getTime())) {
        return { hasRestriction: true, startDate: null, valid: false };
    }
    return { hasRestriction: true, startDate: parsed, valid: true };
}
export async function fetchAndNormalizeBankReceipt(_bankCode, bankConfig, transactionId, transactionUrl) {
    return fetchAndNormalizeViaAdapter(bankConfig, transactionId, ...(transactionUrl ? [transactionUrl] : []));
}
export async function verifyAndSaveBankTransaction(input, shouldSave = true) {
    const { bankCode, receipt, expectedReceiverName, requestedPriceAmount, projectDateRestriction, transactionId, projectId, currency = "ETB", verificationMode = "detailed", } = input;
    const paymentOnly = verificationMode === "payment_only";
    if (!paymentOnly) {
        const normalizedReceiptReceiver = normalizeBankReceiptName(receipt.receiverName);
        const normalizedExpectedReceiver = normalizeBankReceiptName(expectedReceiverName);
        if (!normalizedExpectedReceiver || normalizedReceiptReceiver !== normalizedExpectedReceiver) {
            return {
                status: "FAILED",
                message: "Receiver information does not match the project recipient",
                error: `${normalizedReceiptReceiver} vs ${normalizedExpectedReceiver}`,
                success: false,
                data: null,
                errorKey: "RECEIVER_MISMATCH",
                httpStatus: 400,
            };
        }
    }
    const cleanTransferred = parseNumericAmount(receipt.transferredAmount);
    const cleanPrice = parseNumericAmount(requestedPriceAmount);
    if (!paymentOnly) {
        if (cleanTransferred === null || cleanPrice === null || cleanTransferred !== cleanPrice) {
            return {
                status: "FAILED",
                message: "Transaction amount does not match the requested price",
                success: false,
                data: null,
                vs: `${receipt.transferredAmount} vs ${requestedPriceAmount}`,
                errorKey: "AMOUNT_MISMATCH",
                httpStatus: 400,
            };
        }
    }
    const storedAmount = paymentOnly ? (cleanTransferred ?? cleanPrice) : cleanTransferred;
    if (storedAmount === null || storedAmount === undefined) {
        return {
            status: "FAILED",
            message: paymentOnly
                ? "Could not determine transaction amount for storage."
                : "Transaction amount does not match the requested price",
            success: false,
            data: null,
            errorKey: paymentOnly ? "INVALID_RECEIPT_AMOUNT" : "AMOUNT_MISMATCH",
            httpStatus: 400,
        };
    }
    if (!paymentOnly) {
        const parsedReceiptDate = parseBankReceiptDate(receipt.paymentDateTime);
        if (isNaN(parsedReceiptDate.getTime())) {
            return {
                status: "INVALID",
                message: "Could not read valid payment date from receipt",
                success: false,
                data: null,
                errorKey: "INVALID_RECEIPT_DATE",
                httpStatus: 400,
            };
        }
        const restriction = parseProjectEligibilityStartDate(projectDateRestriction);
        if (!restriction.valid) {
            return {
                status: "FAILED",
                message: "Project transaction eligibility date configuration is invalid.",
                success: false,
                data: null,
                errorKey: "INVALID_DATE_RANGE",
                httpStatus: 400,
            };
        }
        if (restriction.hasRestriction &&
            restriction.startDate &&
            parsedReceiptDate.getTime() < restriction.startDate.getTime()) {
            return {
                status: "FAILED",
                message: "Transaction date is outside the allowed verification period for this project.",
                success: false,
                data: null,
                errorKey: "TRANSACTION_DATE_EXPIRED",
                httpStatus: 400,
            };
        }
    }
    const TransactionData = {
        transaction_id: transactionId,
        transaction_amount: storedAmount,
        created_at: new Date().getDate(),
        method: bankCode,
        status: "verified",
        from: receipt.payerName ? normalizeBankReceiptName(receipt.payerName) : "Unknown Payer",
        to: paymentOnly
            ? receipt.receiverName || expectedReceiverName || "Verified Payee"
            : expectedReceiverName || receipt.receiverName,
        currency,
        risk_score: 98,
    };
    try {
        if (shouldSave) {
            const dbSaveResult = await SaveTransactionData(TransactionData, projectId);
            if (dbSaveResult && dbSaveResult.success === false) {
                if (dbSaveResult.isDuplicate) {
                    return {
                        status: "FAILED",
                        message: dbSaveResult.message,
                        success: false,
                        data: null,
                        errorKey: "DUPLICATE_TRANSACTION",
                        isDuplicate: true,
                        httpStatus: 409,
                    };
                }
                return {
                    status: "FAILED",
                    message: "Internal Server Error",
                    success: false,
                    data: null,
                    errorKey: dbSaveResult.errorKey || "DATABASE_ERROR",
                    httpStatus: 500,
                };
            }
        }
        return {
            status: "VERIFIED",
            message: "Transaction Verified Successfully",
            success: true,
            data: TransactionData,
        };
    }
    catch (err) {
        console.error("[verifyAndSaveBankTransaction Error]", err?.stack || err?.message || err);
        return {
            status: "FAILED",
            message: "Internal Server Error",
            success: false,
            data: null,
            errorKey: "DATABASE_ERROR",
            httpStatus: 500,
        };
    }
}
//# sourceMappingURL=unified-bank-check.js.map