/**
 * Lightweight in-process concurrency gates for bank I/O (no extra infrastructure).
 */
const pdfSlots = createSemaphore(Number(process.env.BANK_PDF_CONCURRENCY || "24"));
const webSlots = createSemaphore(Number(process.env.BANK_WEB_CONCURRENCY || "12"));
const browserSlots = createSemaphore(Number(process.env.BANK_BROWSER_CONCURRENCY || "6"));
function createSemaphore(max) {
    let active = 0;
    const queue = [];
    const acquire = () => new Promise((resolve) => {
        const tryAcquire = () => {
            if (active < max) {
                active += 1;
                resolve();
                return;
            }
            queue.push(tryAcquire);
        };
        tryAcquire();
    });
    const release = () => {
        active = Math.max(0, active - 1);
        const next = queue.shift();
        if (next)
            next();
    };
    return {
        async run(fn) {
            await acquire();
            try {
                return await fn();
            }
            finally {
                release();
            }
        },
        max,
    };
}
export const bankConcurrency = {
    pdf: pdfSlots,
    web: webSlots,
    browser: browserSlots,
};
//# sourceMappingURL=concurrency.js.map