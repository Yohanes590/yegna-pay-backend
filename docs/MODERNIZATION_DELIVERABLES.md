# Backend modernization deliverables

## Preserved API contracts

- Routes unchanged (`POST /api/transaction-create`, etc.).
- Request fields: `price_amount`, `platform`, `transaction_id`, `transaction_url`, `full_name`, `currency`, `receipt_image`, auth headers.
- Response shapes and error codes from `error-registry` unchanged.

## New / modified layout

```
backend/
  config/banks.json
  docs/ARCHITECTURE_ANALYSIS.md
  docs/MODERNIZATION_DELIVERABLES.md
  modules/verification/
    bank.types.ts
    bank.registry.ts
    verification.service.ts
    domain.ts
    concurrency.ts
    ssrf-guard.ts
    structured-logger.ts
    adapters/
      cbe.adapter.ts
      awash.adapter.ts
      boa.adapter.ts
      index.ts
    readers/
      pdf.reader.ts
      web.reader.ts
  lib/bank-registry.types.ts
  lib/bank-registry.ts          (facade)
  lib/bank-resolver.ts          (aliases + enabled check from JSON)
  lib/reading-function/CBE-Reader.ts (uses pdf.reader)
  service/bank-features/unified-bank-check.ts (adapter fetch path)
  lib/prisma.ts                 (pool tuning)
  tests/bank-registry.test.ts
  scripts/load-test-resolution.ts
```

## Adding a bank (no central if/else)

1. Add entry to `config/banks.json` (`enabled`, `domain_env`, `link_readable`, `adapter`).
2. Implement `modules/verification/adapters/<name>.adapter.ts`.
3. Register in `adapters/index.ts`.
4. Set environment variable for `domain_env`.

## Registry flow

`platform` → alias map (`banks.json`) → runtime definition → adapter `fetchTransaction` → adapter `normalizeReceipt` → existing validation/save.

## Readers

- **`pdf`**: `readers/pdf.reader.ts` — size limit, timeout, SSRF host check (used by CBE PDF fetch).
- **`web`**: `readers/web.reader.ts` — HTTP + Playwright helpers with concurrency slots (Awash/BOA still use legacy Playwright wrappers; can migrate incrementally).

## Performance notes

- Concurrency env: `BANK_PDF_CONCURRENCY`, `BANK_WEB_CONCURRENCY`, `BANK_BROWSER_CONCURRENCY`, `PG_POOL_MAX`.
- Playwright-per-request for Awash/BOA remains the main throughput ceiling for live scrapes; pool limits reduce runaway parallelism.

## Testing

- `npm test` — registry / adapter normalization (no live banks).
- `npm run test:load:resolution` — parallel resolution throughput only.

**Load test honesty:** This repo does not include a 1,000-concurrent end-to-end verification harness against live bank endpoints (rate limits, browsers, cost). Use staging with mocked adapters before claiming that SLA.

## Remaining limitations

- Awash/BOA still launch browsers inside legacy readers; migrate those files to shared `web.reader` + browser pool for the next gain.
- `TransactionIDCheck` + unique constraint both guard duplicates; consider consolidating to a single DB constraint path under race conditions.
- End-to-end SSRF checks require DNS at fetch time; misconfigured public DNS for bank hosts should be monitored in production.