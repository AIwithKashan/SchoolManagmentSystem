import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const teacherUserId = session.user.id;
    const { examId, results } = await req.json();

    if (!examId || !Array.isArray(results)) {
      return errorResponse("Missing required parameters", 400);
    }

    // Parallel query lookups
    const [teacher, exam] = await Promise.all([
      db.teacher.findUnique({
        where: { userId: teacherUserId },
      }),
      db.exam.findUnique({
        where: { id: examId },
        select: {
          id: true,
          title: true,
          totalMarks: true,
          passingMarks: true,
          classId: true,
          subject: { select: { name: true } },
        },
      }),
    ]);

    if (!teacher || !exam) {
      return errorResponse("Record not found", 404);
    }

    const studentIds = results.map((r: any) => r.studentId);

    // Parallel fetch students and parents metadata
    const [students, parents] = await Promise.all([
      db.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true },
      }),
      db.parent.findMany({
        where: { studentId: { in: studentIds } },
        select: { userId: true, studentId: true },
      }),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s.name]));
    const subjectName = exam.subject.name;

    // Run transaction for results upsert only
    await db.$transaction(async (tx) => {
      for (const resItem of results) {
        const { studentId, marksObtained, remarks } = resItem;
        const parsedMarks = parseFloat(marksObtained);

        // Upsert exam result record
        await tx.examResult.upsert({
          where: {
            examId_studentId: {
              examId,
              studentId,
            },
          },
          update: {
            marksObtained: parsedMarks,
            remarks: remarks || null,
          },
          create: {
            examId,
            studentId,
            marksObtained: parsedMarks,
            remarks: remarks || null,
          },
        });
      }
    });

    // Create notifications and trigger AI alerts in the background (NON-BLOCKING)
    const handleBackgroundNotifications = async () => {
      try {
        const notificationsData = [];
        for (const resItem of results) {
          const { studentId } = resItem;
          const studentName = studentMap.get(studentId) || "Your child";
          const studentParents = parents.filter((p) => p.studentId === studentId);

          for (const p of studentParents) {
            notificationsData.push({
              userId: p.userId,
              schoolId: teacher.schoolId,
              title: "Exam Results Published",
              content: `${studentName}'s ${subjectName} exam results are now available.`,
              type: "GRADE" as const,
            });
          }
        }

        if (notificationsData.length > 0) {
          await db.notification.createMany({
            data: notificationsData,
          });
        }

        const origin = new URL(req.url).origin;
        await Promise.all(
          results.map((resItem: any) => {
            const { studentId, marksObtained } = resItem;
            const parsedMarks = parseFloat(marksObtained);

            return fetch(`${origin}/api/ai/notifications/trigger`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                triggerType: "GRADE_BELOW_PASSING",
                data: {
                  examId,
                  studentId,
                  marksObtained: parsedMarks,
                },
                schoolId: teacher.schoolId,
              }),
            }).catch((err) => console.error("Error calling grade below passing trigger:", err));
          })
        );
      } catch (err) {
        console.error("Error running background notifications for grades:", err);
      }
    };

    handleBackgroundNotifications().catch(console.error);

    return NextResponse.json({
      success: true,
      message: `Marks saved successfully for ${results.length} students.`,
    });
  } catch (error: any) {
    console.error('[API_ERROR] [TEACHER_GRADES_SAVE_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
