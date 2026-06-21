import axios from "axios";
import pdf from "@cedrugs/pdf-parse";
export async function CBEReadingPDF(transactionData) {
    const cbe_link = `https://apps.cbe.com.et:100/?id=${transactionData.transaction_id}`;
    try {
        const response = await axios.get(cbe_link, {
            responseType: "arraybuffer",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const data = await pdf(Buffer.from(response.data));
        const rawText = data.text;
        const extracted = {
            payer: (rawText.match(/Payer\s*([\s\S]*?)\nAccount/i)?.[1] ?? "Unknown")
                .trim()
                .replace(/\n/g, " "),
            receiver: (rawText.match(/Receiver\s*([\s\S]*?)\nAccount/i)?.[1] ?? "Unknown")
                .trim()
                .replace(/\n/g, " "),
            paymentDateTime: (rawText.match(/Payment Date & Time\s*(.*)\n/i)?.[1] ?? "N/A")
                .trim(),
            referenceNo: (rawText.match(/Reference No\. \(VAT Invoice No\)\s*(.*)\n/i)?.[1] ?? "N/A")
                .trim(),
            transferredAmount: (rawText.match(/Transferred Amount\s*(.*)\n/i)?.[1] ?? "0.00 ETB")
                .trim(),
            totalAmountDebited: (rawText.match(/Total amount debited from customers account\s*(.*)\n/i)?.[1] ?? "0.00 ETB")
                .trim()
        };
        return {
            success: true,
            extractedData: extracted,
            isVerified: extracted.referenceNo + "11294152" === transactionData.transaction_id
        };
    }
    catch (error) {
        return { success: false, error: "Failed to read receipt", };
    }
}
//# sourceMappingURL=CBE-Reader.js.map