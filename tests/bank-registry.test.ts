import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tryResolveExplicitBank, detectBankFromUrl, resolveBankAndTransaction } from "../lib/bank-resolver.js";
import { normalizeBankIdentifier, getBankConfig } from "../lib/bank-registry.js";
import { getRuntimeBankByPlatform, listEnabledBanks } from "../modules/verification/bank.registry.js";
import { cbeAdapter, awashAdapter, boaAdapter } from "../modules/verification/adapters/index.js";
import { parseCbeMbReceiptHtml } from "../lib/reading-function/CBE-MbReceipt-reader.js";

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

    it("detects CBE from alternate receipt domain when configured", () => {
        const previous = process.env.CBE_DOMAIN;
        process.env.CBE_DOMAIN = "https://apps.cbe.com.et/, https://Mbreciept.cbe.com.et/";
        try {
            const detected = detectBankFromUrl("https://Mbreciept.cbe.com.et/?id=FT26063D7W5C");
            assert.equal(detected, "CBE");
            const resolved = resolveBankAndTransaction({
                rawTransactionId: "https://Mbreciept.cbe.com.et/?id=FT26063D7W5C",
            });
            assert.equal(resolved.ok, true);
        } finally {
            if (previous === undefined) delete process.env.CBE_DOMAIN;
            else process.env.CBE_DOMAIN = previous;
        }
    });

    it("accepts mbreciept v2 links even when env lists only apps.cbe.com.et", () => {
        const previous = process.env.CBE_DOMAIN;
        process.env.CBE_DOMAIN = "https://apps.cbe.com.et/";
        try {
            const detected = detectBankFromUrl("https://mbreciept.cbe.com.et/v2-hfHCxzvJMIkoyjrs4eie");
            assert.equal(detected, "CBE");
            const resolved = resolveBankAndTransaction({
                rawTransactionId: "https://mbreciept.cbe.com.et/v2-hfHCxzvJMIkoyjrs4eie",
            });
            assert.equal(resolved.ok, true);
            if (resolved.ok) {
                assert.equal(resolved.transactionId, "v2-hfHCxzvJMIkoyjrs4eie");
                assert.match(resolved.transactionUrl, /mbreciept\.cbe\.com\.et/i);
            }
        } finally {
            if (previous === undefined) delete process.env.CBE_DOMAIN;
            else process.env.CBE_DOMAIN = previous;
        }
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

    it("parses mbreciept HTML receipt fields", () => {
        const sample = `
            <table>
              <tr><td>Payer</td><td>ALICE BEBE</td></tr>
              <tr><td>Receiver</td><td>MERCHANT XYZ</td></tr>
              <tr><td>Transferred Amount</td><td>500.00 ETB</td></tr>
              <tr><td>Payment Date & Time</td><td>11/23/2026, 10:00:00 AM</td></tr>
              <tr><td>Reference No. (VAT Invoice No)</td><td>FT26063D7W5C</td></tr>
            </table>`;
        const parsed = parseCbeMbReceiptHtml(sample);
        assert.equal(parsed.transferredAmount, "500.00 ETB");
        assert.equal(parsed.referenceNo, "FT26063D7W5C");
        assert.match(parsed.receiver, /MERCHANT/);
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