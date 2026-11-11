import { SaveTransactionData } from "../save-transaction.js"

export async function CBECheckFunction(CBEData: any, shouldSave: boolean = true) {
    const {
        inputName,
        extractedName,
        ReceiverInformation,
        receiver_name_data,
        transferredAmount,
        price_amount,
        ProjectDateRestriction,
        ReceiptDate,
        targetID,
        projectId
    } = CBEData

    function normalizeName(name: string): string {
        return name.toLowerCase().trim().replace(/\s+/g, " ");
    }

    const classicDate = new Date(ReceiptDate).getTime()
    const created_date = new Date().getDate()

    if (normalizeName(ReceiverInformation) !== normalizeName(receiver_name_data)) {
        return {
            status: "FAILED",
            message: "Receiver information does not match the project recipient",
            error: normalizeName(ReceiverInformation) + " vs " + normalizeName(receiver_name_data),
            success: false,
            data: null
        }
    }

    const cleanTransferred = Number(String(transferredAmount).replace(/[^0-9.]/g, ''));
    const cleanPrice = Number(String(price_amount).replace(/[^0-9.]/g, ''));

    if (cleanTransferred !== cleanPrice) {
        return {
            status: "FAILED",
            message: "Transaction amount does not match the requested price",
            success: false,
            data: null,
            vs: transferredAmount + " vs " + price_amount
        }
    }

    if (isNaN(classicDate)) {
        return {
            status: "INVALID",
            message: "Could not read valid payment date from receipt",
            success: false,
            data: null
        }
    }

    if (new Date(ReceiptDate).getTime() < new Date(ProjectDateRestriction).getTime()) {
        return {
            status: "FAILED",
            message: "Payment deadline has passed",
            success: false,
            data: null
        }
    } else {
        const ReceiptAmount = Number(String(transferredAmount).replace(/[^0-9.]/g, ''))
        const TransactionData = {
            transaction_id: targetID,
            transaction_amount: ReceiptAmount,
            created_at: created_date,
            method: "link",
            status: "verified",
            from: extractedName || "Unknown Payer",
            to: receiver_name_data,
            currency: "ETB",
            risk_score: 98,
        }

        try {
            // Strictly controlled by the route argument flag
            if (shouldSave) {
                const dbSaveResult = await SaveTransactionData(TransactionData, projectId)

                if (dbSaveResult && dbSaveResult.success === false) {
                    return {
                        message: dbSaveResult.message,
                        success: false,
                        data: null
                    }
                }
            }

            return {
                status: "VERIFIED",
                message: "Transaction Verified Successfully",
                success: true,
                data: TransactionData
            }
        } catch (err: any) {
            return {
                message: err.message,
                success: false,
                data: null
            }
        }
    }
}