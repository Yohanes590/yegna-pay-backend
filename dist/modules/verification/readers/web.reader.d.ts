export declare function fetchHtmlViaHttp(url: string, allowedHostname: string): Promise<string>;
export declare function fetchHtmlViaBrowser(url: string, allowedHostname: string): Promise<string>;
/** Quick sanity check that HTML looks like a receipt page (not a generic error). */
export declare function htmlLooksLikeReceipt(html: string): boolean;
//# sourceMappingURL=web.reader.d.ts.map