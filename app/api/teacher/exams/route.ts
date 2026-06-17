import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExamType } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return errorResponse("Record not found", 404);
    }

    // Fetch classes assigned to this teacher
    const classSubjects = await db.classSubject.findMany({
      where: { teacherId: teacher.id },
      select: { classId: true },
    });

    const classIds = Array.from(new Set(classSubjects.map((cs) => cs.classId)));

    const exams = await db.exam.findMany({
      where: {
        classId: { in: classIds },
      },
      include: {
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { examDate: "desc" },
    });

    return NextResponse.json(exams);
  } catch (error: any) {
    console.error('[API_ERROR] [TEACHER_EXAMS_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return errorResponse("Record not found", 404);
    }

    const {
      title,
      examType,
      classId,
      subjectId,
      examDate,
      totalMarks,
      passingMarks,
      startTime,
      endTime,
    } = await req.json();

    if (!title || !examType || !classId || !subjectId || !examDate || !totalMarks || !passingMarks) {
      return errorResponse("Missing required fields", 400);
    }

    // Map examType string to standard Prisma Enum values
    let enumExamType: ExamType;
    const typeUpper = examType.toUpperCase();
    if (typeUpper === "QUIZ") enumExamType = ExamType.QUIZ;
    else if (typeUpper === "MIDTERM" || typeUpper === "MID") enumExamType = ExamType.MIDTERM;
    else if (typeUpper === "FINAL") enumExamType = ExamType.FINAL;
    else enumExamType = ExamType.TEST;

    const exam = await db.exam.create({
      data: {
        title,
        schoolId: teacher.schoolId,
        classId,
        subjectId,
        examDate: new Date(examDate),
        startTime: startTime || "09:00 AM",
        endTime: endTime || "10:30 AM",
        totalMarks: parseFloat(totalMarks),
        passingMarks: parseFloat(passingMarks),
        examType: enumExamType,
      },
    });

    return NextResponse.json(exam);
  } catch (error: any) {
    console.error('[API_ERROR] [TEACHER_EXAMS_POST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
