import { prisma } from "./prisma.js";
function normalizeName(name) {
    return name.toLowerCase().trim().replace(/\s+/g, " ");
}
function calculateRisk(data) {
    let risk = 0;
    const userAmount = parseFloat(data.user_amount);
    const receiptAmount = parseFloat(data.receipt_amount);
    if (userAmount !== receiptAmount)
        risk += 5;
    if (normalizeName(data.payer) !== normalizeName(data.user_name))
        risk += 3;
    if (!data.transactionID)
        risk += 10;
    return risk;
}
export async function CheckingFunction(userData) {
    try {
        // ✅ REQUIRED FIELD CHECKS
        if (!userData.transactionID) {
            return { status: 400, message: "Transaction ID is required." };
        }
        if (!userData.projectId) {
            return { status: 400, message: "Project ID is required." };
        }
        if (!userData.receiver) {
            return {
                status: 400,
                message: "Receiver is required from receipt.",
            };
        }
        // ✅ FETCH PROJECT FROM DB
        const project = await prisma.projects.findUnique({
            where: { id: userData.projectId },
        });
        if (!project) {
            return {
                status: 400,
                message: "Project not found.",
            };
        }
        // ✅ PROJECT NAME VALIDATION
        if (normalizeName(project.project_name) !==
            normalizeName(userData.project_name)) {
            return {
                status: 400,
                message: "Project name mismatch.",
            };
        }
        // ✅ RECEIVER VALIDATION (REALISTIC)
        const normalizedReceiver = normalizeName(userData.receiver);
        // Default allowed receivers (real-world systems)
        const defaultAllowedReceivers = [
            "yegna pay",
            "tele birr settlement account",
        ];
        // If you later store in DB → project.allowed_receivers
        const allowedReceivers = [
            ...defaultAllowedReceivers,
            normalizeName(project.project_name), // optional
        ];
        if (!allowedReceivers.includes(normalizedReceiver)) {
            return {
                status: 400,
                message: `Receiver mismatch: ${userData.receiver} is not allowed.`,
            };
        }
        // ✅ AMOUNT VALIDATION
        const userAmount = parseFloat(userData.user_amount);
        const receiptAmount = parseFloat(userData.receipt_amount);
        if (isNaN(userAmount) || isNaN(receiptAmount)) {
            return {
                status: 400,
                message: "Invalid amount format.",
            };
        }
        if (userAmount !== receiptAmount) {
            return {
                status: 400,
                message: "Amount mismatch.",
            };
        }
        // ✅ PAYER VALIDATION
        if (normalizeName(userData.payer) !==
            normalizeName(userData.user_name)) {
            return {
                status: 400,
                message: "Payer name mismatch.",
                userInfo: userData,
            };
        }
        // ✅ DUPLICATE CHECK
        const existingTransaction = await prisma.transaction.findUnique({
            where: {
                transaction_id: userData.transactionID,
            },
        });
        if (existingTransaction) {
            return {
                status: 400,
                message: "Duplicate transaction ID.",
            };
        }
        // ✅ RISK SCORE
        const riskScore = calculateRisk(userData);
        let status = "Verified";
        if (riskScore >= 5)
            status = "Pending";
        if (riskScore >= 8)
            status = "Flagged";
        // ✅ SAVE TRANSACTION
        const newTransaction = await prisma.transaction.create({
            data: {
                transaction_id: userData.transactionID,
                from: userData.payer,
                to: project.project_name,
                method: userData.method || "Transfer",
                transaction_amount: userAmount,
                transaction_status: status,
                created_at: new Date(),
                currency: "ETB",
                projectId: userData.projectId,
                risk_score: riskScore,
            },
        });
        return {
            status: 200,
            message: "Transaction verified successfully.",
            data: newTransaction,
            riskScore,
        };
    }
    catch (error) {
        console.error("Transaction Error:", error);
        if (error.code === "P2002") {
            return {
                status: 400,
                message: "Duplicate transaction detected (DB constraint).",
            };
        }
        return {
            status: 500,
            message: "Internal server error.",
        };
    }
}
//# sourceMappingURL=checking-function.js.map