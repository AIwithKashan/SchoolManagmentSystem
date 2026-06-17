import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteParams = { params: { id: string } };

// GET /api/principal/teachers/[id]
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const teacher = await db.teacher.findFirst({
      where: { id: params.id, schoolId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true,
            isActive: true,
          },
        },
        managedClass: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
        classSubjects: {
          include: {
            class: { select: { id: true, name: true, section: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });

    if (!teacher) {
      return errorResponse("Record not found", 404);
    }

    return NextResponse.json({ teacher });
  } catch (error) {
    console.error('[API_ERROR] [TEACHER_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// PUT /api/principal/teachers/[id]
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const existing = await db.teacher.findFirst({ where: { id: params.id, schoolId } });
    if (!existing) {
      return errorResponse("Record not found", 404);
    }

    const body = await req.json();
    const { qualification, specialization, salary, isClassTeacher, classId } = body;

    const updated = await db.$transaction(async (tx) => {
      // 1. Update Teacher fields
      const tch = await tx.teacher.update({
        where: { id: params.id },
        data: {
          ...(qualification && { qualification }),
          ...(specialization !== undefined && { specialization }),
          ...(salary !== undefined && { salary: salary ? parseFloat(salary) : null }),
          ...(isClassTeacher !== undefined && { isClassTeacher: !!isClassTeacher }),
          classId: isClassTeacher && classId ? classId : null,
        },
      });

      // 2. Adjust double 1-to-1 Class relation
      if (isClassTeacher !== undefined) {
        if (isClassTeacher && classId) {
          await tx.class.update({
            where: { id: classId },
            data: { classTeacherId: tch.id },
          });
        } else if (existing.classId) {
          // If deactivated, clear class assignment
          await tx.class.update({
            where: { id: existing.classId },
            data: { classTeacherId: null },
          });
        }
      }

      return tch;
    });

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error) {
    console.error('[API_ERROR] [TEACHER_PUT]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// DELETE /api/principal/teachers/[id] (Soft delete/Deactivate)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const existing = await db.teacher.findFirst({ where: { id: params.id, schoolId } });
    if (!existing) {
      return errorResponse("Record not found", 404);
    }

    // Set linked user.isActive to false
    await db.user.update({
      where: { id: existing.userId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_ERROR] [TEACHER_DELETE]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
