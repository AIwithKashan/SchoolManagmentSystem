import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { FeeStatus, FeeType } from "@prisma/client";

export const dynamic = 'force-dynamic';

// GET /api/principal/reports
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    // ─── 1. Academic Performance Aggregate ────────────────────────────
    const classes = await db.class.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        section: true,
        exams: {
          select: {
            id: true,
            examResults: {
              select: { marksObtained: true },
            },
          },
        },
      },
    });

    const classAverages = classes.map((cls) => {
      let sumMarks = 0;
      let totalMarksCount = 0;

      cls.exams.forEach((exam) => {
        exam.examResults?.forEach((res) => {
          sumMarks += res.marksObtained;
          totalMarksCount++;
        });
      });

      const average = totalMarksCount > 0 ? sumMarks / totalMarksCount : 0;

      return {
        id: cls.id,
        className: `${cls.name}-${cls.section}`,
        averageScore: parseFloat(average.toFixed(1)),
        examsCount: cls.exams.length,
      };
    });

    const subjects = await db.subject.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        exams: {
          select: {
            id: true,
            examResults: {
              select: { marksObtained: true },
            },
          },
        },
      },
    });

    const subjectAverages = subjects.map((sub) => {
      let sumMarks = 0;
      let totalMarksCount = 0;

      sub.exams.forEach((exam) => {
        exam.examResults?.forEach((res) => {
          sumMarks += res.marksObtained;
          totalMarksCount++;
        });
      });

      const average = totalMarksCount > 0 ? sumMarks / totalMarksCount : 0;


      return {
        id: sub.id,
        subjectName: sub.name,
        averageScore: parseFloat(average.toFixed(1)),
        examsCount: sub.exams.length,
      };
    });

    // ─── 2. Financial Collections Breakdown ───────────────────────────
    const fees = await db.fee.findMany({
      where: { schoolId },
      select: {
        amount: true,
        paidAmount: true,
        feeType: true,
        status: true,
        student: {
          select: { classId: true },
        },
      },
    });

    const collectionsByType: Record<string, { collected: number; target: number }> = {
      TUITION: { collected: 0, target: 0 },
      TRANSPORT: { collected: 0, target: 0 },
      LAB: { collected: 0, target: 0 },
      SPORTS: { collected: 0, target: 0 },
      OTHER: { collected: 0, target: 0 },
    };

    fees.forEach((fee) => {
      const type = fee.feeType;
      if (!collectionsByType[type]) {
        collectionsByType[type] = { collected: 0, target: 0 };
      }
      collectionsByType[type].collected += fee.paidAmount;
      collectionsByType[type].target += fee.amount;
    });

    const financialData = Object.keys(collectionsByType).map((key) => {
      const item = collectionsByType[key];
      const pending = Math.max(0, item.target - item.collected);
      const collectionRate = item.target > 0 ? (item.collected / item.target) * 100 : 0;

      return {
        feeType: key,
        collected: item.collected,
        pending,
        totalTarget: item.target,
        collectionRate: parseFloat(collectionRate.toFixed(1)),
      };
    });

    // Class level pending financial summary - optimized in-memory grouping
    const classFinancialSummary = classes.map((cls) => {
      const clsFees = fees.filter((f) => f.student?.classId === cls.id);

      let target = 0;
      let collected = 0;

      clsFees.forEach((f) => {
        target += f.amount;
        collected += f.paidAmount;
      });

      return {
        id: cls.id,
        className: `${cls.name}-${cls.section}`,
        collected,
        pending: Math.max(0, target - collected),
      };
    });

    // ─── 3. School Averages Trend optimized ───────────────────────────
    const now = new Date();
    const pastFourMonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    
    const mRecordsAll = await db.attendance.findMany({
      where: {
        student: { schoolId },
        date: { gte: pastFourMonthsStart },
      },
      select: { status: true, date: true },
    });

    const monthStats = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearVal = d.getFullYear();
      const monthVal = d.getMonth();

      const mRecords = mRecordsAll.filter((r) => {
        const rDate = new Date(r.date);
        return rDate.getFullYear() === yearVal && rDate.getMonth() === monthVal;
      });

      const total = mRecords.length;
      const present = mRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
      const rate = total > 0 ? (present / total) * 100 : 85;

      monthStats.push({
        monthName: d.toLocaleString("default", { month: "short" }),
        attendanceRate: parseFloat(rate.toFixed(1)),
      });
    }

    return NextResponse.json({
      academics: {
        classAverages,
        subjectAverages,
      },
      finances: {
        breakdown: financialData,
        classBalances: classFinancialSummary,
      },
      attendanceTrend: monthStats,
    });
  } catch (error) {
    console.error('[API_ERROR] [REPORTS_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
