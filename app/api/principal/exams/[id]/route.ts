import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExamType } from "@prisma/client";

// GET /api/principal/exams/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const examId = params.id;

    const exam = await db.exam.findFirst({
      where: { id: examId, schoolId },
      include: {
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true } },
        examResults: {
          include: {
            student: {
              select: {
                name: true,
                admissionNumber: true,
                rollNumber: true,
              },
            },
          },
          orderBy: { student: { name: "asc" } },
        },
      },
    });

    if (!exam) {
      return errorResponse("Record not found", 404);
    }

    // Calculations
    const totalResults = exam.examResults.length;
    let sumMarks = 0;
    let passedCount = 0;

    const formattedResults = exam.examResults.map((r) => {
      sumMarks += r.marksObtained;
      const isPassed = r.marksObtained >= exam.passingMarks;
      if (isPassed) passedCount++;

      return {
        id: r.id,
        studentId: r.studentId,
        studentName: r.student.name,
        admissionNumber: r.student.admissionNumber,
        rollNumber: r.student.rollNumber,
        marksObtained: r.marksObtained,
        grade: r.grade,
        remarks: r.remarks,
        isPassed,
      };
    });

    const classAverage = totalResults > 0 ? sumMarks / totalResults : 0;
    const passRate = totalResults > 0 ? (passedCount / totalResults) * 100 : 0;

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        examDate: exam.examDate.toISOString(),
        startTime: exam.startTime,
        endTime: exam.endTime,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        examType: exam.examType,
        className: `${exam.class.name}-${exam.class.section}`,
        subjectName: exam.subject.name,
      },
      results: formattedResults,
      stats: {
        totalGraded: totalResults,
        classAverage,
        passRate,
        failedCount: totalResults - passedCount,
      },
    });
  } catch (error) {
    console.error('[API_ERROR] [EXAM_DETAIL_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// PUT /api/principal/exams/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const examId = params.id;

    const exam = await db.exam.findFirst({
      where: { id: examId, schoolId },
    });

    if (!exam) {
      return errorResponse("Record not found", 404);
    }

    const body = await req.json();
    const { title, examDate, startTime, endTime, totalMarks, passingMarks, examType, subjectId } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (examDate !== undefined) updateData.examDate = new Date(examDate);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (totalMarks !== undefined) updateData.totalMarks = parseFloat(totalMarks);
    if (passingMarks !== undefined) updateData.passingMarks = parseFloat(passingMarks);
    if (examType !== undefined) updateData.examType = examType as ExamType;
    if (subjectId !== undefined) updateData.subjectId = subjectId;

    const updated = await db.exam.update({
      where: { id: examId },
      data: updateData,
    });

    return NextResponse.json({ success: true, exam: updated });
  } catch (error) {
    console.error('[API_ERROR] [EXAM_PUT]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// DELETE /api/principal/exams/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const examId = params.id;

    const exam = await db.exam.findFirst({
      where: { id: examId, schoolId },
    });

    if (!exam) {
      return errorResponse("Record not found", 404);
    }

    await db.exam.delete({
      where: { id: examId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_ERROR] [EXAM_DELETE]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
