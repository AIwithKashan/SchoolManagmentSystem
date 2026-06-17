import { errorResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const lessonPlans = await db.lessonPlan.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: "desc" },
    });

    // Resolve class names in-memory to maintain flexibility
    const classIds = Array.from(new Set(lessonPlans.map((lp: any) => lp.classId))) as string[];
    const classes = await db.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true, section: true },
    });

    const classMap = new Map(classes.map((c: any) => [c.id, `${c.name} ${c.section}`]));

    const enrichedLessons = lessonPlans.map((lp: any) => ({
      id: lp.id,
      title: lp.title,
      subject: lp.subject,
      classId: lp.classId,
      className: classMap.get(lp.classId) || "Unknown Class",
      topic: lp.topic,
      duration: lp.duration,
      content: lp.content,
      isAIGenerated: lp.isAIGenerated,
      createdAt: lp.createdAt,
      updatedAt: lp.updatedAt,
    }));

    return NextResponse.json(enrichedLessons);
  } catch (error: any) {
    console.error('[API_ERROR] [LESSON_PLANS_GET_ERROR]', error);
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
      classId,
      subject,
      topic,
      duration,
      content,
      isAIGenerated,
    } = await req.json();

    if (!title || !classId || !subject || !topic || !duration || !content) {
      return errorResponse("Missing required fields", 400);
    }

    const lessonPlan = await db.lessonPlan.create({
      data: {
        title,
        teacherId: teacher.id,
        classId,
        subject,
        topic,
        duration: parseInt(duration),
        content,
        isAIGenerated: isAIGenerated !== undefined ? isAIGenerated : false,
      },
    });

    return NextResponse.json(lessonPlan);
  } catch (error: any) {
    console.error('[API_ERROR] [LESSON_PLAN_POST_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
