import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
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
      select: { classId: true, dueDate: true, totalMarks: true },
    });

    if (!assignment) {
      return errorResponse("Record not found", 404);
    }

    // 1. Fetch all submissions for this assignment
    const submissions = await db.submission.findMany({
      where: { assignmentId: id },
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
      orderBy: { submittedAt: "desc" },
    });

    // 2. Fetch all active students in the assigned class
    const classStudents = await db.student.findMany({
      where: {
        classId: assignment.classId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        rollNumber: true,
        photo: true,
      },
      orderBy: { rollNumber: "asc" },
    });

    // 3. Find students who haven't submitted yet
    const submittedStudentIds = new Set(submissions.map((s) => s.studentId));
    const notSubmitted = classStudents.filter((s) => !submittedStudentIds.has(s.id));

    return NextResponse.json({
      dueDate: assignment.dueDate,
      totalMarks: assignment.totalMarks,
      submissions,
      notSubmitted,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [ASSIGNMENT_SUBMISSIONS_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
