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
    const studentId = id;

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

    // Resolve student classId
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    if (!student?.classId) {
      return errorResponse("Record not found", 404);
    }

    // Fetch subjects assigned to this class
    const classSubjects = await db.classSubject.findMany({
      where: { classId: student.classId },
      include: {
        subject: { select: { name: true } },
      },
    });

    // Mock quiz templates
    const quizTemplates = [
      {
        titleSuffix: "Chapter 1 Focus Check",
        questionsCount: 5,
        timeLimitMinutes: 10,
        daysAgoDue: 2,
      },
      {
        titleSuffix: "Midterm Assessment Quiz",
        questionsCount: 10,
        timeLimitMinutes: 15,
        daysAgoDue: -3, // Due in 3 days
      },
      {
        titleSuffix: "Concepts Concept Evaluation",
        questionsCount: 8,
        timeLimitMinutes: 12,
        daysAgoDue: -7, // Due in 7 days
      },
    ];

    const quizzes: any[] = [];
    
    // Generate quizzes for actual subjects
    classSubjects.forEach((cs) => {
      const subjectName = cs.subject.name;

      quizTemplates.forEach((template, idx) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() - template.daysAgoDue);

        quizzes.push({
          id: `quiz-${cs.id}-${idx}`,
          title: `${subjectName} — ${template.titleSuffix}`,
          subjectName: subjectName,
          questionsCount: template.questionsCount,
          timeLimit: template.timeLimitMinutes, // in minutes
          dueDate: dueDate.toISOString(),
          // Status defaults to Not Taken, client-side overrides using localStorage
          status: "Not Taken",
          score: null,
        });
      });
    });

    // Fallback if no subjects found
    if (quizzes.length === 0) {
      const defaultSubjects = ["Mathematics", "English", "General Science"];
      defaultSubjects.forEach((subName, sIdx) => {
        quizTemplates.forEach((template, idx) => {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() - template.daysAgoDue);

          quizzes.push({
            id: `quiz-def-${sIdx}-${idx}`,
            title: `${subName} — ${template.titleSuffix}`,
            subjectName: subName,
            questionsCount: template.questionsCount,
            timeLimit: template.timeLimitMinutes,
            dueDate: dueDate.toISOString(),
            status: "Not Taken",
            score: null,
          });
        });
      });
    }

    return NextResponse.json(quizzes);
  } catch (error: any) {
    console.error('[API_ERROR] [PARENT_QUIZZES_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
