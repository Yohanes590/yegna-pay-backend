/**
 * Lightweight in-process concurrency gates for bank I/O (no extra infrastructure).
 */
export declare const bankConcurrency: {
    pdf: {
        run<T>(fn: () => Promise<T>): Promise<T>;
        max: number;
    };
    web: {
        run<T>(fn: () => Promise<T>): Promise<T>;
        max: number;
    };
    browser: {
        run<T>(fn: () => Promise<T>): Promise<T>;
        max: number;
    };
};
//# sourceMappingURL=concurrency.d.ts.map