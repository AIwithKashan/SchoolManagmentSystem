import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { classId: string; date: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return errorResponse("Record not found", 404);
    }

    const { classId, date } = params;
    const { records } = await req.json();

    if (!records || !Array.isArray(records)) {
      return errorResponse("Missing records payload", 400);
    }

    // Normalize date
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Save update inside a transaction (delete existing, save new)
    await db.$transaction(async (tx) => {
      // Find old absent student IDs before deleting so we don't send duplicate alerts
      const previouslyAbsent = await tx.attendance.findMany({
        where: {
          classId,
          date: normalizedDate,
          status: "ABSENT",
        },
        select: { studentId: true },
      });
      const previouslyAbsentIds = new Set(previouslyAbsent.map((a) => a.studentId));

      // Delete existing records
      await tx.attendance.deleteMany({
        where: {
          classId,
          date: normalizedDate,
        },
      });

      // Insert new records
      const recordsToCreate = records.map((r: any) => ({
        studentId: r.studentId,
        classId,
        date: normalizedDate,
        status: r.status,
        markedById: teacher.id,
        note: r.note || null,
      }));

      await tx.attendance.createMany({
        data: recordsToCreate,
      });

      // Dispatch notifications for students newly marked ABSENT (who weren't absent before)
      const newlyAbsentRecords = records.filter(
        (r: any) => r.status === "ABSENT" && !previouslyAbsentIds.has(r.studentId)
      );

      for (const record of newlyAbsentRecords) {
        const parents = await tx.parent.findMany({
          where: { studentId: record.studentId },
          select: { userId: true },
        });

        const student = await tx.student.findUnique({
          where: { id: record.studentId },
          select: { name: true },
        });

        const studentName = student?.name ?? "your child";

        for (const p of parents) {
          await tx.notification.create({
            data: {
              userId: p.userId,
              schoolId: teacher.schoolId,
              title: "Attendance Notice",
              content: `Your child ${studentName} was marked absent today.`,
              type: "ATTENDANCE",
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Attendance updated successfully" });
  } catch (error: any) {
    console.error('[API_ERROR] [ATTENDANCE_PUT_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
