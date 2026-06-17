import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

// Global cache setup
const globalForReportCards = globalThis as unknown as {
  approvedReportCards: Record<string, any>;
};

if (!globalForReportCards.approvedReportCards) {
  globalForReportCards.approvedReportCards = {};
}

export async function POST(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
    console.error('[API_ERROR]', e);
    return errorResponse("Server error. Please try again.", 500);
  }

    const body = await req.json().catch(() => ({}));
    const { reportCards, term, academicYear, devSchoolId, devUserId } = body;

    const isDev = process.env.NODE_ENV === "development";
    let schoolId = session?.user?.schoolId;
    let userId = session?.user?.id;
    let userRole = session?.user?.role;

    if (!session) {
      if (isDev && devSchoolId && devUserId) {
        schoolId = devSchoolId;
        userId = devUserId;
        userRole = "PRINCIPAL";
      } else {
        return errorResponse("You are not authorized to do this", 401);
      }
    }

    if (userRole !== "PRINCIPAL" || !schoolId || !userId) {
      return errorResponse("You do not have permission", 403);
    }

    if (!Array.isArray(reportCards)) {
      return errorResponse("Missing reportCards array", 400);
    }

    for (const card of reportCards) {
      const { studentId, studentName, overallGrade } = card;
      const key = `${studentId}_${term}_${academicYear}`;
      
      // 1. Cache report card details
      globalForReportCards.approvedReportCards[key] = card;

      // 2. Fetch student parents
      const parents = await db.parent.findMany({
        where: { studentId },
        select: { userId: true },
      });

      // 3. Create parent notifications
      for (const p of parents) {
        await db.notification.create({
          data: {
            userId: p.userId,
            schoolId,
            title: "Report Card Published",
            content: `The progress report card for ${studentName} for the ${term} (${academicYear}) has been published. Overall Grade: ${overallGrade}.`,
            type: NotificationType.GRADE,
            isRead: false,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully approved and published ${reportCards.length} report cards.`,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [REPORT_CARDS_APPROVE_POST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
