import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { invalidateCache } from "@/lib/cache-invalidation";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET /api/principal/teachers
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const skip = (page - 1) * limit;

    const where = {
      schoolId,
      ...(search && {
        OR: [
          { employeeId: { contains: search, mode: "insensitive" as const } },
          { user: { name: { contains: search, mode: "insensitive" as const } } },
          { user: { email: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [teachers, total, totalCount, activeCount, classTeachersCount, unassignedCount] = await Promise.all([
      db.teacher.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          qualification: true,
          specialization: true,
          joiningDate: true,
          salary: true,
          isClassTeacher: true,
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
            select: {
              subject: { select: { name: true } },
              class: { select: { name: true, section: true } },
            },
          },
        },
        orderBy: { employeeId: "asc" },
        skip,
        take: limit,
      }),
      db.teacher.count({ where }),
      db.teacher.count({ where: { schoolId } }),
      db.teacher.count({ where: { schoolId, user: { isActive: true } } }),
      db.teacher.count({ where: { schoolId, isClassTeacher: true } }),
      db.teacher.count({ where: { schoolId, isClassTeacher: false } }),
    ]);

    const formatted = teachers.map((t) => {
      // Gather subjects
      const subjectsMap = new Set<string>();
      t.classSubjects.forEach((cs) => {
        if (cs.subject?.name) subjectsMap.add(cs.subject.name);
      });
      const subjects = Array.from(subjectsMap);

      // Gather classes
      const classesMap = new Set<string>();
      t.classSubjects.forEach((cs) => {
        if (cs.class) classesMap.add(`${cs.class.name}-${cs.class.section}`);
      });
      if (t.managedClass) {
        classesMap.add(`${t.managedClass.name}-${t.managedClass.section}`);
      }
      const assignedClasses = Array.from(classesMap);

      return {
        id: t.id,
        employeeId: t.employeeId,
        name: t.user.name,
        email: t.user.email,
        phone: t.user.phone,
        avatar: t.user.avatar,
        isActive: t.user.isActive,
        qualification: t.qualification,
        specialization: t.specialization,
        joiningDate: t.joiningDate,
        salary: t.salary ? Number(t.salary) : null,
        isClassTeacher: t.isClassTeacher,
        managedClass: t.managedClass,
        subjects,
        assignedClasses,
      };
    });

    return new Response(
      JSON.stringify({
        teachers: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: {
          total: totalCount,
          active: activeCount,
          classTeachers: classTeachersCount,
          unassigned: unassignedCount,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error('[API_ERROR] [TEACHERS_GET]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}

// POST /api/principal/teachers
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || session.user.role !== "PRINCIPAL") {
      return errorResponse("You are not authorized to do this", 401);
    }
    const schoolId = session.user.schoolId;
    const body = await req.json();

    const {
      name,
      phone,
      email,
      avatar,
      cnic,
      qualification,
      specialization,
      joiningDate,
      salary,
      isClassTeacher,
      classId,
      subjectsToTeach, // array of subject IDs
      classesToTeach,  // array of class IDs
      tempPassword,
    } = body;

    if (!name || !email || !tempPassword || !qualification || !joiningDate) {
      return errorResponse("Name, email, qualification, joiningDate, and password are required", 400);
    }

    // Check unique email
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse("This record already exists", 409);
    }

    const hashedPassword = await hash(tempPassword, 10);

    const result = await db.$transaction(async (tx) => {
      // 1. Generate unique employee ID
      const count = await tx.teacher.count({ where: { schoolId } });
      const employeeId = `TCH-${String(count + 1).padStart(3, "0")}`;

      // 2. Create user account
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "TEACHER",
          name,
          phone: phone || null,
          avatar: avatar || null,
          isActive: true,
        },
      });

      // 3. Create teacher profile
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          schoolId,
          employeeId,
          qualification,
          specialization: specialization || null,
          joiningDate: new Date(joiningDate),
          salary: salary ? parseFloat(salary) : null,
          isClassTeacher: !!isClassTeacher,
          classId: isClassTeacher && classId ? classId : null,
        },
      });

      // 4. Update double 1-to-1 link for Class Teacher if assigned
      if (isClassTeacher && classId) {
        // Clear previous teacher if class has one
        await tx.class.update({
          where: { id: classId },
          data: { classTeacherId: teacher.id },
        });
      }

      // 5. Create ClassSubject teaching assignments
      if (classesToTeach && subjectsToTeach) {
        for (const cid of classesToTeach) {
          for (const sid of subjectsToTeach) {
            await tx.classSubject.upsert({
              where: {
                classId_subjectId: {
                  classId: cid,
                  subjectId: sid,
                },
              },
              update: { teacherId: teacher.id },
              create: {
                classId: cid,
                subjectId: sid,
                teacherId: teacher.id,
              },
            });
          }
        }
      }

      return teacher;
    });

    try {
      invalidateCache.teachers();
      invalidateCache.schoolStats();
    } catch (e) {
      console.error('[API_ERROR] Revalidation failed:', e);
      return errorResponse("Server error. Please try again.", 500);
    }

    return successResponse({ teacher: result }, "Teacher created successfully");
  } catch (error) {
    console.error('[API_ERROR] [TEACHERS_POST]', error);
    return errorResponse("Server error. Please try again.", 500);
  }
}
