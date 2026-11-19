export interface PdfFetchResult {
    buffer: Buffer;
    text: string;
}
export declare function fetchAndParsePdf(url: string, allowedHostname: string): Promise<PdfFetchResult>;
//# sourceMappingURL=pdf.reader.d.ts.map