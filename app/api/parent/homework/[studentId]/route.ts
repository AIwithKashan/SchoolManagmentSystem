import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { studentId } = params;

    // Verify parent has access to this student
    const parent = await db.parent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
      },
    });

    if (!parent) {
      return errorResponse("You do not have permission", 403);
    }

    // Get student details
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    if (!student?.classId) {
      return errorResponse("Record not found", 404);
    }

    // Get all assignments for this student's class
    const assignments = await db.assignment.findMany({
      where: {
        classId: student.classId,
        isActive: true,
      },
      include: {
        subject: { select: { name: true } },
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
        submissions: {
          where: { studentId },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    // Enrich assignments list with status mapping
    const enriched = assignments.map((assign) => {
      const submission = assign.submissions[0] || null;
      let status: "Not Submitted" | "Submitted" | "Graded" = "Not Submitted";
      if (submission) {
        status = submission.status === "GRADED" ? "Graded" : "Submitted";
      }

      return {
        id: assign.id,
        title: assign.title,
        description: assign.description,
        dueDate: assign.dueDate.toISOString(),
        totalMarks: assign.totalMarks,
        attachmentUrl: assign.attachmentUrl,
        subjectName: assign.subject.name,
        teacherName: assign.teacher.user.name,
        status,
        submission: submission
          ? {
              id: submission.id,
              content: submission.content,
              attachmentUrl: submission.attachmentUrl,
              submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : null,
              teacherScore: submission.teacherScore,
              teacherFeedback: submission.teacherFeedback,
            }
          : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_HOMEWORK_LIST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
