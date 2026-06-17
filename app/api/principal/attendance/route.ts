import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AttendanceStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

// GET /api/principal/attendance
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Overall Today's stats
    const todayRecords = await db.attendance.findMany({
      where: {
        student: { schoolId },
        date: { gte: todayStart, lte: todayEnd },
      },
      select: { status: true, classId: true },
    });

    const totalToday = todayRecords.length;
    const presentToday = todayRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
    ).length;
    const absentToday = todayRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const leaveToday = todayRecords.filter((r) => r.status === AttendanceStatus.LEAVE).length;
    const lateToday = todayRecords.filter((r) => r.status === AttendanceStatus.LATE).length;

    const todayRate = totalToday > 0 ? (presentToday / totalToday) * 100 : 0;

    // 2. Class by class today's status
    const classes = await db.class.findMany({
      where: { schoolId },
      include: {
        students: {
          where: { isActive: true },
          select: { id: true },
        },
        classTeacher: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [{ gradeLevel: "asc" }, { section: "asc" }],
    });

    const classBreakdown = classes.map((cls) => {
      const clsTodayRecords = todayRecords.filter((r) => r.classId === cls.id);

      const clsTotal = clsTodayRecords.length;
      const clsPresent = clsTodayRecords.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
      ).length;

      const rate = clsTotal > 0 ? (clsPresent / clsTotal) * 100 : 0;

      return {
        id: cls.id,
        className: cls.name,
        section: cls.section,
        displayName: `${cls.name} - ${cls.section}`,
        teacherName: cls.classTeacher?.user.name ?? "Not Assigned",
        studentCount: cls.students.length,
        markedCount: clsTotal,
        presentCount: clsPresent,
        rate,
      };
    });

    // 3. At-risk students (attendance < 75% this month)
    const monthlyRecords = await db.attendance.findMany({
      where: {
        student: { schoolId, isActive: true },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        studentId: true,
        status: true,
      },
    });

    // Group by student
    const studentStats: Record<string, { total: number; present: number }> = {};
    monthlyRecords.forEach((rec) => {
      if (!studentStats[rec.studentId]) {
        studentStats[rec.studentId] = { total: 0, present: 0 };
      }
      studentStats[rec.studentId].total += 1;
      if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.LATE) {
        studentStats[rec.studentId].present += 1;
      }
    });

    // Filter students where rate < 75% and total marked days > 2
    const atRiskIds = Object.keys(studentStats).filter((sid) => {
      const s = studentStats[sid];
      const rate = s.total > 0 ? s.present / s.total : 0;
      return rate < 0.75 && s.total >= 3;
    });

    const atRiskStudents = await db.student.findMany({
      where: {
        id: { in: atRiskIds },
      },
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        rollNumber: true,
        class: {
          select: {
            name: true,
            section: true,
          },
        },
        parents: {
          select: {
            user: { select: { name: true, phone: true } },
          },
          take: 1,
        },
      },
    });

    const formattedAtRisk = atRiskStudents.map((stud) => {
      const statsForStudent = studentStats[stud.id];
      const totalDays = statsForStudent.total;
      const presentDays = statsForStudent.present;
      const rate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        id: stud.id,
        name: stud.name,
        admissionNumber: stud.admissionNumber,
        rollNumber: stud.rollNumber,
        className: stud.class ? `${stud.class.name}-${stud.class.section}` : "Unassigned",
        parentName: stud.parents[0]?.user.name ?? "Not Recorded",
        parentPhone: stud.parents[0]?.user.phone ?? "Not Recorded",
        totalDays,
        presentDays,
        rate,
      };
    });

    // 4. Monthly check-in log (last 20 checkins overall)
    const recentLogs = await db.attendance.findMany({
      where: { student: { schoolId } },
      include: {
        student: {
          select: {
            name: true,
            admissionNumber: true,
            class: { select: { name: true, section: true } },
          },
        },
      },
      orderBy: { date: "desc" },
      take: 20,
    });

    const formattedLogs = recentLogs.map((log) => ({
      id: log.id,
      studentName: log.student.name,
      admissionNumber: log.student.admissionNumber,
      className: log.student.class ? `${log.student.class.name}-${log.student.class.section}` : "Unassigned",
      date: log.date.toISOString(),
      status: log.status,
      note: log.note,
    }));

    return NextResponse.json({
      todayStats: {
        totalMarked: totalToday,
        presentCount: presentToday,
        absentCount: absentToday,
        leaveCount: leaveToday,
        lateCount: lateToday,
        rate: todayRate,
      },
      classBreakdown,
      atRiskStudents: formattedAtRisk,
      recentLogs: formattedLogs,
    });
  } catch (error) {
    console.error('[API_ERROR] [ATTENDANCE_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
