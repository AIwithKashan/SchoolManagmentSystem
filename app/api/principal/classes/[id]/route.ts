import { errorResponse } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteParams = { params: { id: string } };

const GRADE_NAMES: Record<number, string> = {
  0: "Nursery", 1: "Prep",
  2: "Grade 1", 3: "Grade 2", 4: "Grade 3", 5: "Grade 4",
  6: "Grade 5", 7: "Grade 6", 8: "Grade 7", 9: "Grade 8",
  10: "Grade 9", 11: "Grade 10",
};

// ─── GET /api/principal/classes/[id] ─────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const cls = await db.class.findFirst({
      where: { id: params.id, schoolId },
      include: {
        classTeacher: {
          include: {
            user: { select: { name: true, email: true, avatar: true, phone: true } },
          },
        },
        students: {
          where: { isActive: true },
          include: {
            attendances: {
              select: { status: true },
            },
          },
          orderBy: { name: "asc" },
        },
        classSubjects: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            teacher: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!cls) {
      return errorResponse("Record not found", 404);
    }

    // Compute attendance % per student
    const students = cls.students.map((student) => {
      const total = student.attendances.length;
      const present = student.attendances.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const pct = total > 0 ? Math.round((present / total) * 100) : null;
      return {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        gender: student.gender,
        admissionNumber: student.admissionNumber,
        attendancePct: pct,
      };
    });

    const subjects = cls.classSubjects.map((cs) => ({
      id: cs.id,
      subject: cs.subject,
      teacher: cs.teacher ? { id: cs.teacher.id, name: cs.teacher.user.name } : null,
    }));

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        section: cls.section,
        gradeLevel: cls.gradeLevel,
        displayName: `${GRADE_NAMES[cls.gradeLevel] ?? cls.name} - ${cls.section}`,
        capacity: cls.capacity,
        classTeacher: cls.classTeacher
          ? {
              id: cls.classTeacher.id,
              name: cls.classTeacher.user.name,
              email: cls.classTeacher.user.email,
              avatar: cls.classTeacher.user.avatar,
              phone: cls.classTeacher.user.phone,
            }
          : null,
        students,
        subjects,
      },
    });
  } catch (error) {
    console.error('[API_ERROR] [CLASS_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// ─── PUT /api/principal/classes/[id] ─────────────────────────────────
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const existing = await db.class.findFirst({ where: { id: params.id, schoolId } });
    if (!existing) {
      return errorResponse("Record not found", 404);
    }

    const body = await req.json();
    const { gradeLevel, section, capacity, classTeacherId } = body as {
      gradeLevel?: number;
      section?: string;
      capacity?: number;
      classTeacherId?: string | null;
    };

    const name =
      gradeLevel !== undefined
        ? (GRADE_NAMES[gradeLevel] ?? `Grade ${gradeLevel}`)
        : existing.name;

    // Validate teacher belongs to school
    if (classTeacherId) {
      const teacher = await db.teacher.findFirst({
        where: { id: classTeacherId, schoolId },
      });
      if (!teacher) {
        return errorResponse("Teacher not found in this school", 400);
      }
    }

    const updated = await db.class.update({
      where: { id: params.id },
      data: {
        ...(gradeLevel !== undefined && { gradeLevel, name }),
        ...(section && { section: section.trim().toUpperCase() }),
        ...(capacity !== undefined && { capacity }),
        ...(classTeacherId !== undefined && { classTeacherId: classTeacherId ?? null }),
      },
      include: {
        classTeacher: { include: { user: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      success: true,
      class: {
        id: updated.id,
        name: updated.name,
        section: updated.section,
        gradeLevel: updated.gradeLevel,
        displayName: `${updated.name} - ${updated.section}`,
        capacity: updated.capacity,
        classTeacher: updated.classTeacher
          ? { id: updated.classTeacher.id, name: updated.classTeacher.user.name }
          : null,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return errorResponse("This record already exists", 409);
    }
    console.error("[API_ERROR] [CLASS_PUT]", error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// ─── DELETE /api/principal/classes/[id] ──────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const existing = await db.class.findFirst({ where: { id: params.id, schoolId } });
    if (!existing) {
      return errorResponse("Record not found", 404);
    }

    // Guard: don't delete if students are enrolled
    const studentCount = await db.student.count({
      where: { classId: params.id, isActive: true },
    });
    if (studentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete class with ${studentCount} active student${studentCount > 1 ? "s" : ""}. Please reassign or deactivate students first.`,
        },
        { status: 409 }
      );
    }

    await db.class.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API_ERROR] [CLASS_DELETE]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
