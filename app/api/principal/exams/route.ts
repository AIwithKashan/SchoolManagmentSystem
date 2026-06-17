import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExamType } from "@prisma/client";

// GET /api/principal/exams
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId") ?? "";
    const type = searchParams.get("type") ?? "";
    const search = searchParams.get("search") ?? "";

    const where: any = {
      schoolId,
      ...(search && { title: { contains: search, mode: "insensitive" } }),
      ...(classId && classId !== "all" && { classId }),
      ...(type && type !== "all" && { examType: type as ExamType }),
    };

    const exams = await db.exam.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true } },
        examResults: { select: { id: true } },
      },
      orderBy: { examDate: "desc" },
    });

    const formatted = exams.map((ex) => ({
      id: ex.id,
      title: ex.title,
      classId: ex.classId,
      className: `${ex.class.name}-${ex.class.section}`,
      subjectId: ex.subjectId,
      subjectName: ex.subject.name,
      examDate: ex.examDate.toISOString(),
      startTime: ex.startTime,
      endTime: ex.endTime,
      totalMarks: ex.totalMarks,
      passingMarks: ex.passingMarks,
      examType: ex.examType,
      gradedStudentsCount: ex.examResults.length,
    }));

    // Generate stats for dashboard overview
    const [totalScheduled, totalResultsCount] = await Promise.all([
      db.exam.count({ where: { schoolId } }),
      db.examResult.count({ where: { exam: { schoolId } } }),
    ]);

    // Average grade pass rate calculation
    const allResults = await db.examResult.findMany({
      where: { exam: { schoolId } },
      include: { exam: { select: { passingMarks: true } } },
    });
    const passingResultsCount = allResults.filter(
      (r) => r.marksObtained >= r.exam.passingMarks
    ).length;
    const avgPassRate = allResults.length > 0 ? (passingResultsCount / allResults.length) * 100 : 0;

    return NextResponse.json({
      exams: formatted,
      stats: {
        totalScheduled,
        gradedResultsCount: totalResultsCount,
        avgPassRate,
      },
    });
  } catch (error) {
    console.error('[API_ERROR] [EXAMS_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// POST /api/principal/exams
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const body = await req.json();

    const {
      title,
      classId,
      subjectId,
      examDate,
      startTime,
      endTime,
      totalMarks,
      passingMarks,
      examType,
    } = body;

    if (!title || !classId || !subjectId || !examDate || !startTime || !endTime || !totalMarks || !passingMarks || !examType) {
      return errorResponse("Missing required fields", 400);
    }

    const exam = await db.exam.create({
      data: {
        title,
        schoolId,
        classId,
        subjectId,
        examDate: new Date(examDate),
        startTime,
        endTime,
        totalMarks: parseFloat(totalMarks),
        passingMarks: parseFloat(passingMarks),
        examType: examType as ExamType,
      },
      include: {
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
      },
    });

    // Dispatch smart notifications trigger for scheduled exam
    try {
      const origin = new URL(req.url).origin;
      fetch(`${origin}/api/ai/notifications/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: "EXAM_SCHEDULED",
          data: {
            examId: exam.id,
          },
          schoolId,
        }),
      }).catch((err) => console.error("Error calling exam scheduled trigger:", err));
    } catch (err) {
    console.error('[API_ERROR] Error setting up exam scheduled trigger:', err);
    return errorResponse("Server error. Please try again.", 500);
  }

    return NextResponse.json({ success: true, exam });
  } catch (error) {
    console.error('[API_ERROR] [EXAMS_POST]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
