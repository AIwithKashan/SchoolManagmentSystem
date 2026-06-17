import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { successResponse, errorResponse } from "@/lib/api-response";

// ─── GRADE display name map ───────────────────────────────────────────
const GRADE_NAMES: Record<number, string> = {
  0: "Nursery",
  1: "Prep",
  2: "Grade 1",
  3: "Grade 2",
  4: "Grade 3",
  5: "Grade 4",
  6: "Grade 5",
  7: "Grade 6",
  8: "Grade 7",
  9: "Grade 8",
  10: "Grade 9",
  11: "Grade 10",
};

// ─── GET /api/principal/classes ───────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const classes = await db.class.findMany({
      where: { schoolId },
      include: {
        classTeacher: {
          include: { user: { select: { name: true } } },
        },
        students: {
          where: { isActive: true },
          select: { id: true },
        },
        classSubjects: {
          select: { id: true },
        },
      },
      orderBy: [{ gradeLevel: "asc" }, { section: "asc" }],
    });

    const result = classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      section: cls.section,
      gradeLevel: cls.gradeLevel,
      displayName: `${GRADE_NAMES[cls.gradeLevel] ?? cls.name} - ${cls.section}`,
      capacity: cls.capacity,
      studentCount: cls.students.length,
      subjectCount: cls.classSubjects.length,
      classTeacher: cls.classTeacher
        ? { id: cls.classTeacher.id, name: cls.classTeacher.user.name }
        : null,
      createdAt: cls.createdAt,
    }));

    // Stats
    const totalStudents = result.reduce((s, c) => s + c.studentCount, 0);
    const avgSize =
      result.length > 0 ? Math.round(totalStudents / result.length) : 0;

    return NextResponse.json({ classes: result, totalStudents, avgSize });
  } catch (error) {
    console.error('[API_ERROR] [CLASSES_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// ─── POST /api/principal/classes ──────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;

    const body = await req.json();
    const { gradeLevel, section, capacity, classTeacherId } = body as {
      gradeLevel: number;
      section: string;
      capacity?: number;
      classTeacherId?: string;
    };

    if (gradeLevel === undefined || !section?.trim()) {
      return errorResponse("gradeLevel and section are required", 400);
    }

    const name = GRADE_NAMES[gradeLevel] ?? `Grade ${gradeLevel}`;
    const sectionUpper = section.trim().toUpperCase();

    // Validate classTeacher belongs to school
    if (classTeacherId) {
      const teacher = await db.teacher.findFirst({
        where: { id: classTeacherId, schoolId },
      });
      if (!teacher) {
        return errorResponse("Teacher not found in this school", 400);
      }
    }

    const newClass = await db.class.create({
      data: {
        name,
        section: sectionUpper,
        gradeLevel,
        schoolId,
        capacity: capacity ?? 30,
        ...(classTeacherId ? { classTeacherId } : {}),
      },
      include: {
        classTeacher: { include: { user: { select: { name: true } } } },
      },
    });

    try {
      revalidateTag("classes");
    } catch (e) {
    console.error('[API_ERROR] Revalidation failed:', e);
    return errorResponse("Server error. Please try again.", 500);
  }

    return successResponse({
      class: {
        id: newClass.id,
        name: newClass.name,
        section: newClass.section,
        gradeLevel: newClass.gradeLevel,
        displayName: `${newClass.name} - ${newClass.section}`,
        capacity: newClass.capacity,
        classTeacher: newClass.classTeacher
          ? { id: newClass.classTeacher.id, name: newClass.classTeacher.user.name }
          : null,
      },
    }, "Class created successfully");
  } catch (error: any) {
    if (error?.code === "P2002") {
      return errorResponse("A class with this name and section already exists", 409);
    }
    console.error("[API_ERROR] [CLASSES_POST]", error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
