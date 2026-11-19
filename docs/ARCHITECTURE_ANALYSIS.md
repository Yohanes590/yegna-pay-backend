# Yegna Pay Backend — Architecture Analysis (Pre-Modernization)

## 1. Original layout (summary)

| Area | Role |
|------|------|
| `app.ts` / `server.ts` | Express 5 app, route mounting, Prisma-backed runtime |
| `routes/transaction/api-transaction-create.ts` | Primary verification API (`POST /api/transaction-create`) |
| `lib/bank-registry.ts` | Hard-coded `Record<BankIdentifier, BankConfig>` with inline reader lambdas |
| `lib/bank-resolver.ts` | Platform/URL resolution, alias map, domain detection |
| `service/bank-features/unified-bank-check.ts` | Receipt fetch, normalization (CBE branch), validation + save |
| `lib/reading-function/*` | CBE PDF (axios), Awash/BOA Playwright scrapers |
| `service/save-transaction.ts` | Prisma create + duplicate handling (`transaction_id` unique) |
| `lib/prisma.ts` | Single `pg.Pool` + Prisma adapter |

**Request lifecycle (verification):** auth/API key → project lookup → credit check → `resolveBankAndTransaction` → optional QR path → `fetchAndNormalizeBankReceipt` → business rules → `verifyAndSaveBankTransaction` → webhook/log/response.

## 2. Coupling and duplication

- Bank definitions lived in **TypeScript** (`bank-registry.ts`), not configuration; adding a bank required editing the central registry object.
- `fetchAndNormalizeBankReceipt` used **`if (bankCode === "CBE")`** for a different reader shape vs Awash/BOA.
- `bank-resolver.ts` duplicated alias lists separate from registry identifiers (`AWAS_BANK` vs `AWASH`).
- Domain validation logic was **copied** between `cbe-domain.ts` and `validateBankDomain` in `bank-registry.ts`.
- CBE reader fetched PDFs **without** shared download size limits or SSRF guards (Awash/BOA launch **one browser per request** — heavy under concurrency).

## 3. Performance / concurrency risks

| Risk | Impact |
|------|--------|
| Playwright browser per Awash/BOA request | High CPU/memory; poor behavior at 100+ parallel verifications |
| No global cap on concurrent bank HTTP/PDF fetches | Thundering herd against bank sites and local memory |
| `pg.Pool` default sizing only | Possible connection churn under load |
| Synchronous PDF buffer handling on event loop | Acceptable for small PDFs but unbounded download size was risky |
| Registry/config loaded per call (N/A — static module) | Low; readers re-read env each time — acceptable |

## 4. Transaction safety (existing strengths)

- `Transaction.transaction_id` is **`@unique`** in Prisma; `SaveTransactionData` maps `P2002` to duplicate responses.
- Pre-save `TransactionIDCheck` still used on the hot path in routes.
- Failed reads return FAILED/INVALID **without** persisting verified rows (save only after validation).

## 5. Error handling (existing)

- `AppError` + `error-registry` for structured API errors on the transaction route.
- Bank resolution returns plain `{ ok: false, message }` shapes preserved by the route layer.

## 6. Modernization direction (this change set)

- **`config/banks.json`** — enable flag, platform, env domain, `link_readable`, adapter id, aliases.
- **`modules/verification/`** — registry loader, adapters, shared web/PDF readers, SSRF + size limits, concurrency gates.
- **`lib/bank-registry.ts`** — thin backward-compatible facade over the new registry (no import path changes for routes).
- **Unified normalization** via adapter `normalizeReceipt()` (removes CBE `if` in fetch layer).
- **Tests** for registry resolution; load script documented (full 1k concurrency requires staging + real bank mocks).

External API contracts, routes, and payload field names are **unchanged**.