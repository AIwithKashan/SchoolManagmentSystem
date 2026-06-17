import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { classId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { classId } = params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");

    // Case 1: Date is provided -> Return records for that day
    if (dateStr) {
      const targetDate = new Date(dateStr);
      targetDate.setUTCHours(0, 0, 0, 0);

      const records = await db.attendance.findMany({
        where: {
          classId,
          date: targetDate,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              rollNumber: true,
              photo: true,
            },
          },
        },
        orderBy: {
          student: {
            rollNumber: "asc",
          },
        },
      });

      return NextResponse.json(records);
    }

    // Case 2: Month and Year are provided -> Return records for that month
    if (monthStr && yearStr) {
      const month = parseInt(monthStr);
      const year = parseInt(yearStr);

      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return errorResponse("Invalid month or year parameters", 400);
      }

      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));

      const records = await db.attendance.findMany({
        where: {
          classId,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              rollNumber: true,
            },
          },
        },
      });

      return NextResponse.json(records);
    }

    return errorResponse("Missing query parameters (date, or month and year)", 400);
  } catch (error: any) {
    console.error('[API_ERROR] [ATTENDANCE_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
