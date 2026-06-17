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

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return errorResponse("You are not authorized to do this", 401);
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return errorResponse("Record not found", 404);
    }

    const { id } = params;

    const lessonPlan = await db.lessonPlan.findUnique({
      where: { id },
    });

    if (!lessonPlan) {
      return errorResponse("Record not found", 404);
    }

    if (lessonPlan.teacherId !== teacher.id) {
      return errorResponse("You do not have permission", 403);
    }

    // Resolve class details
    const targetClass = await db.class.findUnique({
      where: { id: lessonPlan.classId },
      select: { id: true, name: true, section: true },
    });

    const enrichedLesson = {
      ...lessonPlan,
      className: targetClass ? `${targetClass.name} ${targetClass.section}` : "Unknown Class",
    };

    return NextResponse.json(enrichedLesson);
  } catch (error: any) {
    console.error('[API_ERROR] [LESSON_PLAN_SINGLE_GET_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const body = await req.json();

    const {
      title,
      classId,
      subject,
      topic,
      duration,
      content,
      isAIGenerated,
    } = body;

    const lessonPlan = await db.lessonPlan.findUnique({
      where: { id },
    });

    if (!lessonPlan) {
      return errorResponse("Record not found", 404);
    }

    if (lessonPlan.teacherId !== teacher.id) {
      return errorResponse("You do not have permission", 403);
    }

    const updated = await db.lessonPlan.update({
      where: { id },
      data: {
        title: title !== undefined ? title : lessonPlan.title,
        classId: classId !== undefined ? classId : lessonPlan.classId,
        subject: subject !== undefined ? subject : lessonPlan.subject,
        topic: topic !== undefined ? topic : lessonPlan.topic,
        duration: duration !== undefined ? parseInt(duration) : lessonPlan.duration,
        content: content !== undefined ? content : lessonPlan.content,
        isAIGenerated: isAIGenerated !== undefined ? isAIGenerated : lessonPlan.isAIGenerated,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[API_ERROR] [LESSON_PLAN_SINGLE_PUT_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    const lessonPlan = await db.lessonPlan.findUnique({
      where: { id },
    });

    if (!lessonPlan) {
      return errorResponse("Record not found", 404);
    }

    if (lessonPlan.teacherId !== teacher.id) {
      return errorResponse("You do not have permission", 403);
    }

    await db.lessonPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Lesson plan deleted successfully" });
  } catch (error: any) {
    console.error('[API_ERROR] [LESSON_PLAN_SINGLE_DELETE_ERROR]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
