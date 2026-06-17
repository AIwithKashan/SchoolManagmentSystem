import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { classId } = params;
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");

    const now = new Date();
    const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;
    const year = yearStr ? parseInt(yearStr) : now.getFullYear();

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return errorResponse("Invalid month or year parameters", 400);
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    // 1. Fetch active students in class
    const students = await db.student.findMany({
      where: {
        classId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        rollNumber: true,
      },
      orderBy: {
        rollNumber: "asc",
      },
    });

    // 2. Fetch all attendance logs for this class in this month
    const attendanceLogs = await db.attendance.findMany({
      where: {
        classId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        studentId: true,
        date: true,
        status: true,
      },
    });

    // 3. Count total unique dates where attendance was marked for this class
    const uniqueDates = new Set(
      attendanceLogs.map((log) => new Date(log.date).toISOString().split("T")[0])
    );
    const totalMarkedDays = uniqueDates.size;

    // 4. Calculate attendance percentage per student
    const stats = students.map((student) => {
      const studentLogs = attendanceLogs.filter((log) => log.studentId === student.id);
      
      const presentCount = studentLogs.filter(
        (log) => log.status === "PRESENT" || log.status === "LATE"
      ).length;
      
      const absentCount = studentLogs.filter((log) => log.status === "ABSENT").length;
      const leaveCount = studentLogs.filter((log) => log.status === "LEAVE").length;

      // Percentage = present days / total days marked. If no days marked, default to 100% or 0
      const percentage =
        totalMarkedDays > 0
          ? Math.round((presentCount / totalMarkedDays) * 100)
          : 100;

      return {
        studentId: student.id,
        name: student.name,
        rollNumber: student.rollNumber ?? "N/A",
        presentCount,
        absentCount,
        leaveCount,
        totalDays: totalMarkedDays,
        percentage,
      };
    });

    return NextResponse.json({
      month,
      year,
      totalMarkedDays,
      stats,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [ATTENDANCE_STATS_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
