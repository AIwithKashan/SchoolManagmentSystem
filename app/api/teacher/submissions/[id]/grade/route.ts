import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { id } = params;
    const { teacherScore, teacherFeedback, status } = await req.json();

    if (status && !["GRADED", "RETURNED"].includes(status)) {
      return errorResponse("Invalid status value", 400);
    }

    // 1. Fetch submission details
    const submission = await db.submission.findUnique({
      where: { id },
      include: {
        assignment: { select: { title: true, totalMarks: true, schoolId: true } },
        student: { select: { name: true } },
      },
    });

    if (!submission) {
      return errorResponse("Record not found", 404);
    }

    const score = parseFloat(teacherScore);
    if (isNaN(score) || score < 0 || score > submission.assignment.totalMarks) {
      return NextResponse.json(
        { error: `Score must be a number between 0 and ${submission.assignment.totalMarks}` },
        { status: 400 }
      );
    }

    // 2. Perform updates inside transaction
    const updatedSubmission = await db.$transaction(async (tx) => {
      // Update submission record
      const updated = await tx.submission.update({
        where: { id },
        data: {
          teacherScore: score,
          teacherFeedback: teacherFeedback || null,
          status: status || "GRADED",
        },
      });

      // Find parents linked to this student
      const parents = await tx.parent.findMany({
        where: { studentId: submission.studentId },
        select: { userId: true },
      });

      const studentName = submission.student.name;
      const title = submission.assignment.title;
      const totalMarks = submission.assignment.totalMarks;

      // Notify parent accounts
      for (const p of parents) {
        await tx.notification.create({
          data: {
            userId: p.userId,
            schoolId: submission.assignment.schoolId,
            title: "Assignment Graded",
            content: `Your child ${studentName} received a grade of ${score}/${totalMarks} on the assignment "${title}".`,
            type: "GRADE",
          },
        });
      }

      return updated;
    });

    return NextResponse.json(updatedSubmission);
  } catch (error: any) {
    console.error('[API_ERROR] [SUBMISSION_GRADE_PUT_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
