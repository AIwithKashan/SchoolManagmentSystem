import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const globalForReportCards = globalThis as unknown as {
  approvedReportCards: Record<string, any>;
};

export async function GET(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
    console.error('[API_ERROR]', e);
    return errorResponse("Server error. Please try again.", 500);
  }

    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");
    const term = url.searchParams.get("term");
    const academicYear = url.searchParams.get("academicYear");
    const devUserId = url.searchParams.get("devUserId");

    const isDev = process.env.NODE_ENV === "development";
    let userId = session?.user?.id;
    let userRole = session?.user?.role;

    if (!session) {
      if (isDev && devUserId) {
        userId = devUserId;
        userRole = "PARENT";
      } else {
        return errorResponse("You are not authorized to do this", 401);
      }
    }

    if (userRole !== "PARENT" || !userId) {
      return errorResponse("You do not have permission", 403);
    }

    if (!studentId || !term || !academicYear) {
      return errorResponse("Missing studentId, term, or academicYear", 400);
    }

    // 1. Verify parent owns child link
    const link = await db.parent.findFirst({
      where: {
        userId,
        studentId,
      },
    });

    if (!link) {
      return errorResponse("You do not have permission", 403);
    }

    // 2. Query global cache
    const key = `${studentId}_${term}_${academicYear}`;
    const reportCard = globalForReportCards.approvedReportCards?.[key];

    if (!reportCard) {
      return errorResponse("Record not found", 404);
    }

    return NextResponse.json({ success: true, reportCard });
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_REPORT_CARD_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
