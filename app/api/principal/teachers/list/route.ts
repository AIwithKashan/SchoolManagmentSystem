import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

// GET /api/principal/teachers/list — lightweight list for dropdowns
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("Unauthorized", 401);
    }
    const schoolId = session.user.schoolId;

    const teachers = await db.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        employeeId: true,
        isClassTeacher: true,
        user: {
          select: {
            name: true,
            email: true,
            avatar: true,
          },
        },
        classTeacherOf: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return successResponse({
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.user.name,
        email: t.user.email,
        avatar: t.user.avatar,
        employeeId: t.employeeId,
        isClassTeacher: t.isClassTeacher,
        classTeacherOf: t.classTeacherOf
          ? { id: t.classTeacherOf.id, name: `${t.classTeacherOf.name} - ${t.classTeacherOf.section}` }
          : null,
      })),
    });
  } catch (error) {
    console.error('[API_ERROR] [TEACHERS_LIST]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
