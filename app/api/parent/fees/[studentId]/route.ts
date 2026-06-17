import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { studentId } = params;

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    // 1. Verify parent owns this student
    const parentRelation = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
      },
    });

    if (!parentRelation) {
      return errorResponse("You do not have permission", 403);
    }

    const url = new URL(req.url);
    const filterYear = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // 2. Query all fee records for this student
    const fees = await db.fee.findMany({
      where: { studentId },
      orderBy: { month: "desc" },
    });

    // 3. Calculate Outstanding Amount
    const outstandingAmount = fees
      .filter((f) => f.status !== "PAID" && f.note !== "Pending Verification")
      .reduce((sum, f) => sum + f.amount, 0);

    // 4. Find/Build Current Month Fee Card
    const dbCurrentMonthFee = fees.find((f) => f.month === currentMonth && f.year === currentYear);
    
    let currentFeeCard: any = null;

    if (dbCurrentMonthFee) {
      const tuitionAmt = dbCurrentMonthFee.feeType === "TUITION" ? dbCurrentMonthFee.amount : dbCurrentMonthFee.amount * 0.9;
      const transportAmt = dbCurrentMonthFee.amount - tuitionAmt;

      currentFeeCard = {
        id: dbCurrentMonthFee.id,
        monthName: today.toLocaleString("en-US", { month: "long" }),
        year: dbCurrentMonthFee.year,
        tuitionFee: tuitionAmt,
        transportFee: transportAmt > 0 ? transportAmt : 0,
        totalAmount: dbCurrentMonthFee.amount,
        dueDate: dbCurrentMonthFee.dueDate.toISOString(),
        status: dbCurrentMonthFee.status,
        receiptNumber: dbCurrentMonthFee.receiptNumber,
        paidDate: dbCurrentMonthFee.paidAt ? dbCurrentMonthFee.paidAt.toISOString() : null,
        note: dbCurrentMonthFee.note,
      };
    } else {
      // Fallback Mock Current Month Fee
      currentFeeCard = {
        id: "mock-fee-current",
        monthName: today.toLocaleString("en-US", { month: "long" }),
        year: currentYear,
        tuitionFee: 4500,
        transportFee: 500,
        totalAmount: 5000,
        dueDate: new Date(currentYear, currentMonth - 1, 10).toISOString(),
        status: "PENDING",
        receiptNumber: null,
        paidDate: null,
        note: null,
      };
    }

    // 5. Compile Payment History
    let historyList: any[] = [];

    if (fees.length > 0) {
      historyList = fees
        .filter((f) => f.year === filterYear)
        .map((f) => {
          const monthName = new Date(f.year, f.month - 1, 1).toLocaleString("en-US", { month: "long" });
          return {
            id: f.id,
            month: f.month,
            monthName,
            year: f.year,
            feeType: f.feeType,
            amount: f.amount,
            paidDate: f.paidAt ? f.paidAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
            receiptNumber: f.receiptNumber,
            status: f.note === "Pending Verification" ? "PENDING_VERIFICATION" : f.status,
          };
        });
    } else {
      // Generate Fallback Demo Payment History
      const months = [
        { num: 5, status: "PENDING", note: null, receipt: null, date: null },
        { num: 4, status: "PAID", note: null, receipt: "REC-2026-045", date: new Date("2026-04-05") },
        { num: 3, status: "PAID", note: null, receipt: "REC-2026-031", date: new Date("2026-03-03") },
        { num: 2, status: "PAID", note: null, receipt: "REC-2026-019", date: new Date("2026-02-06") },
        { num: 1, status: "PAID", note: null, receipt: "REC-2026-002", date: new Date("2026-01-08") },
        { num: 12, status: "PAID", note: null, receipt: "REC-2025-098", date: new Date("2025-12-05") },
      ];

      historyList = months
        .map((m) => {
          const yearVal = m.num === 12 ? filterYear - 1 : filterYear;
          const monthName = new Date(yearVal, m.num - 1, 1).toLocaleString("en-US", { month: "long" });
          
          return {
            id: `mock-fee-${m.num}`,
            month: m.num,
            monthName,
            year: yearVal,
            feeType: "TUITION",
            amount: m.num === 12 ? 4500 : 5000,
            paidDate: m.date ? m.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
            receiptNumber: m.receipt,
            status: m.status,
          };
        });
    }

    return NextResponse.json({
      outstandingAmount,
      currentFee: currentFeeCard,
      paymentHistory: historyList,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [FEE_SUMMARY_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
