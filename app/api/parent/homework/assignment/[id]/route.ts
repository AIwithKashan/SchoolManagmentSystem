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

    if (!session?.user?.id || session.user.role !== "PARENT") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return errorResponse("Missing studentId parameter", 400);
    }

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

    // Get assignment details
    const assignment = await db.assignment.findUnique({
      where: { id },
      include: {
        subject: { select: { name: true } },
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!assignment) {
      return errorResponse("Record not found", 404);
    }

    // Fetch this student's submission (if any)
    const submission = await db.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: id,
          studentId: studentId,
        },
      },
    });

    let status: "Not Submitted" | "Submitted" | "Graded" = "Not Submitted";
    if (submission) {
      status = submission.status === "GRADED" ? "Graded" : "Submitted";
    }

    const result = {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate.toISOString(),
      totalMarks: assignment.totalMarks,
      attachmentUrl: assignment.attachmentUrl,
      subjectName: assignment.subject.name,
      teacherName: assignment.teacher.user.name,
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

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_ASSIGNMENT_DETAIL_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
