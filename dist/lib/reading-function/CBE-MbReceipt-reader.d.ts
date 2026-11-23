export interface CbeMbReceiptData {
    payer: string;
    receiver: string;
    paymentDateTime: string;
    referenceNo: string;
    transferredAmount: string;
    totalAmountDebited: string;
}
export declare function parseCbeMbReceiptHtml(html: string): CbeMbReceiptData;
/** Mbreciept hosts a Nuxt SPA — render with a headless browser, then parse HTML. */
export declare function readCbeMbReceiptPage(receiptUrl: string): Promise<CbeMbReceiptData>;
//# sourceMappingURL=CBE-MbReceipt-reader.d.ts.map