/**
 * Lightweight load test for CPU-bound registry resolution (no live bank calls).
 * Full 1000-concurrent verification requires staging mocks + real DB; run separately.
 */
import { performance } from "node:perf_hooks";
import { resolveBankAndTransaction } from "../lib/bank-resolver.js";
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY || "200");
const ITERATIONS = Number(process.env.LOAD_TEST_ITERATIONS || "5000");
async function main() {
    const started = performance.now();
    let failures = 0;
    const worker = async () => {
        for (let i = 0; i < ITERATIONS; i++) {
            const result = resolveBankAndTransaction({
                platform: i % 3 === 0 ? "AWASH" : i % 3 === 1 ? "CBE" : "BOA",
                rawTransactionId: `FTTEST${i}`,
            });
            if (!result.ok)
                failures += 1;
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    const elapsedMs = performance.now() - started;
    const totalOps = CONCURRENCY * ITERATIONS;
    console.log(JSON.stringify({
        event: "load_test_resolution_complete",
        concurrency: CONCURRENCY,
        iterationsPerWorker: ITERATIONS,
        totalOps,
        failures,
        elapsedMs: Math.round(elapsedMs),
        opsPerSecond: Math.round(totalOps / (elapsedMs / 1000)),
    }));
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=load-test-resolution.js.map