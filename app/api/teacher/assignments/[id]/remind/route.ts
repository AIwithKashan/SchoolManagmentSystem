import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { id } = params;

    const assignment = await db.assignment.findUnique({
      where: { id },
      select: { title: true, classId: true, schoolId: true },
    });

    if (!assignment) {
      return errorResponse("Record not found", 404);
    }

    // 1. Fetch all active students in class
    const students = await db.student.findMany({
      where: { classId: assignment.classId, isActive: true },
      select: { id: true, name: true },
    });

    // 2. Fetch submitted student IDs
    const submissions = await db.submission.findMany({
      where: { assignmentId: id },
      select: { studentId: true },
    });

    const submittedStudentIds = new Set(submissions.map((s) => s.studentId));

    // 3. Find unsubmitted students
    const unsubmittedStudents = students.filter((s) => !submittedStudentIds.has(s.id));

    if (unsubmittedStudents.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "All students have already submitted." });
    }

    const unsubmittedStudentIds = unsubmittedStudents.map((s) => s.id);

    // 4. Find parents of unsubmitted students
    const parents = await db.parent.findMany({
      where: { studentId: { in: unsubmittedStudentIds } },
      select: { userId: true, studentId: true },
    });

    // 5. Create notifications in transaction
    await db.$transaction(
      parents.map((p) => {
        const studentName = unsubmittedStudents.find((s) => s.id === p.studentId)?.name || "your child";
        return db.notification.create({
          data: {
            userId: p.userId,
            schoolId: assignment.schoolId,
            title: "Assignment Reminder",
            content: `Reminder: The assignment "${assignment.title}" is pending submission for ${studentName}.`,
            type: "GENERAL",
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      count: unsubmittedStudents.length,
      message: `Reminders sent to ${unsubmittedStudents.length} students.`,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [ASSIGNMENT_REMIND_POST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
