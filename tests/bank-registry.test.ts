import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tryResolveExplicitBank, detectBankFromUrl, resolveBankAndTransaction } from "../lib/bank-resolver.js";
import { normalizeBankIdentifier, getBankConfig } from "../lib/bank-registry.js";
import { getRuntimeBankByPlatform, listEnabledBanks } from "../modules/verification/bank.registry.js";
import { cbeAdapter, awashAdapter, boaAdapter } from "../modules/verification/adapters/index.js";

describe("bank registry", () => {
    it("loads three enabled banks from config", () => {
        const banks = listEnabledBanks();
        assert.equal(banks.length, 3);
    });

    it("resolves platform aliases", () => {
        assert.equal(tryResolveExplicitBank("AWASH"), "AWASH");
        assert.equal(tryResolveExplicitBank("awash bank"), "AWASH");
        assert.equal(tryResolveExplicitBank("BOA"), "BOA");
        assert.equal(tryResolveExplicitBank("CBE"), "CBE");
        assert.equal(tryResolveExplicitBank("NOT_A_BANK"), null);
    });

    it("maps registry identifiers", () => {
        assert.equal(normalizeBankIdentifier("AWASH"), "AWAS_BANK");
        assert.equal(normalizeBankIdentifier("CBE"), "CBE");
        const cfg = getBankConfig("AWASH");
        assert.equal(cfg.platform, "AWASH");
        assert.equal(cfg.adapterId, "awash");
        assert.equal(cfg.linkReadable, "web");
    });

    it("detects bank host from URL", () => {
        const detected = detectBankFromUrl("https://apps.cbe.com.et/?id=FT26063D7W5C");
        assert.equal(detected, "CBE");
    });

    it("rejects unknown platform", () => {
        const resolved = resolveBankAndTransaction({
            platform: "UNKNOWN_BANK",
            rawTransactionId: "FT123",
        });
        assert.equal(resolved.ok, false);
        if (!resolved.ok) {
            assert.match(resolved.message, /Unknown platform/);
        }
    });

    it("adapters normalize sample Awash payload", () => {
        const outcome = awashAdapter.normalizeReceipt(
            {
                receiverName: "Merchant LLC",
                senderName: "Customer",
                transferredAmount: "100.00 ETB",
                transactionDate: "11/01/2026 02:15:00 PM",
                transactionReference: "TXN123",
            },
            "TXN123"
        );
        assert.equal(outcome.ok, true);
        if (outcome.ok) {
            assert.equal(outcome.receipt.referenceNo, "TXN123");
        }
    });

    it("CBE adapter flags invalid reference", () => {
        const outcome = cbeAdapter.normalizeReceipt(
            {
                success: true,
                isVerified: false,
                extractedData: {
                    receiver: "A",
                    payer: "B",
                    transferredAmount: "1",
                    paymentDateTime: "2026-01-01",
                    referenceNo: "X",
                },
            },
            "DIFFERENT"
        );
        assert.equal(outcome.ok, false);
    });

    it("runtime lookup by platform", () => {
        const runtime = getRuntimeBankByPlatform("BOA");
        assert.ok(runtime);
        assert.equal(runtime?.adapter.adapterId, boaAdapter.adapterId);
    });
});