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

    // 1. Fetch all active students in the class
    const students = await db.student.findMany({
      where: { classId, isActive: true },
      select: {
        id: true,
        name: true,
        rollNumber: true,
      },
      orderBy: { rollNumber: "asc" },
    });

    // 2. Fetch all exams scheduled for this class
    const exams = await db.exam.findMany({
      where: { classId },
      include: {
        subject: { select: { id: true, name: true } },
      },
      orderBy: { examDate: "desc" },
    });

    // 3. Fetch all exam results for the class's exams
    const examIds = exams.map((e) => e.id);
    const examResults = await db.examResult.findMany({
      where: {
        examId: { in: examIds },
      },
    });

    return NextResponse.json({
      students,
      exams,
      examResults,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [TEACHER_GRADES_CLASS_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
